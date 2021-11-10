'use strict';

const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');
const Bottleneck = require('bottleneckp');
const seenreq = require('seenreq');
const HttpClient = require('./http/client');
const { Request, SplashRequest } = require('./http/request');
const { createResponse } = require('./http/response');
const log = require('./logger');

function checkJQueryNaming(options) {
	if ('jquery' in options) {
		options.jQuery = options.jquery;
		delete options.jquery;
	}
	return options;
}

/**
 * TaiSpider
 */
class TaiSpider extends EventEmitter {

	/**
	 * Both request method to obtain messages are implemented. To use standard polling, set `polling: true`
	 * on `options`. Notice that [webHook](https://core.telegram.org/bots/api#setwebhook) will need a SSL certificate.
	 * Emits `message` when a message arrives.
	 *
	 * @class TaiSpider
	 * @constructor
	 */
	constructor(options = {}) {
		super();
		this.httpClient = new HttpClient();
		this.init(options);
	}

	/**
	 * @class Taispider
	 * @constructor
	 */
	init(options) {
		var self = this;

		var defaultOptions = {
			envs: {},
			autoWindowClose: true,
			forceUTF8: true,
			gzip: true,
			incomingEncoding: null,
			jQuery: true,
			maxConnections: 10,
			method: 'GET',
			priority: 5,
			priorityRange: 10,
			rateLimit: 0,
			referer: false,
			retries: 3,
			retryTimeout: 10000,
			timeout: 15000,
			skipDuplicates: true,
			rotateUA: false,
			homogeneous: false,
			http2: false
		};

		// return defaultOptions with overridden properties from options.
		self.options = _.extend(defaultOptions, options);

		// you can use jquery or jQuery
		self.options = checkJQueryNaming(self.options);

		// Don't make these options persist to individual queries
		self.globalOnlyOptions = ['maxConnections', 'rateLimit', 'priorityRange', 'homogeneous', 'skipDuplicates', 'rotateUA'];

		self.limiters = new Bottleneck.Cluster(self.options.maxConnections, self.options.rateLimit, self.options.priorityRange, self.options.priority, self.options.homogeneous);
		Object.defineProperty(self, 'queueSize', {
			get: function () {
				return self.limiters.unfinishedClients;
			}
		});

		self.setLimiterProperty('splash', 'rateLimit', 1000);

		//maintain the http2 sessions
		self.http2Connections = {};

		log.level = self.options.debug ? 'debug' : 'info';

		self.envs = self.options.envs;

		self.seen = new seenreq(self.options.seenreq);
		self.seen.initialize().then(() => log.debug('seenreq is initialized.')).catch(e => log.error(e));

		self.splash_seen = new seenreq(self.options.splash_seenreq);
		self.splash_seen.initialize().then(() => log.debug('splash seenreq is initialized.')).catch(e => log.error(e));

		self.on('_init_start', function () {
			if (self.options.pipelines && self.options.pipelines.length > 0) {
				self.pipelines = [];
				self.options.pipelines.forEach(pipeline => {
					let p = new pipeline();
					p.open_spider && p.open_spider(self);
					self.pipelines.push(p);
				});
			}
			self.emit('_init_finished');
		});

		self.on('_release', function () {
			log.debug('Queue size: %d', this.queueSize);

			if (this.limiters.empty) {
				setTimeout(function () {
					if (self.limiters && self.limiters.empty) {
						self.httpClient.close();
						return self.emit('drain');
					}
				}, 1000);
			}
		});

		self.on('drain', function () {
			if (self.pipelines) {
				self.pipelines.forEach(p => {
					p.close_spider && p.close_spider(self);
				});
			}
			log.info('on drain');
		});
	}

	addPipeline(pipeline) {
		this.options.pipelines.push(pipeline);
	}

	setLimiterProperty(limiter, property, value) {
		var self = this;

		switch (property) {
		case 'rateLimit': self.limiters.key(limiter).setRateLimit(value); break;
		default: break;
		}
	}

	isIllegal(options) {
		return (_.isNull(options) || _.isUndefined(options) || (!_.isString(options) && !_.isPlainObject(options)));
	}

	direct(options) {
		var self = this;

		if (self.isIllegal(options) || !_.isPlainObject(options)) {
			return log.warn('Illegal queue option: ', JSON.stringify(options));
		}

		if (!('callback' in options) || !_.isFunction(options.callback)) {
			return log.warn('must specify callback function when using sending direct request with crawler');
		}

		options = checkJQueryNaming(options);

		// direct request does not follow the global preRequest
		options.preRequest = options.preRequest || null;

		_.defaults(options, self.options);

		// direct request is not allowed to retry
		options.retries = 0;

		// direct request does not emit event:'request' by default
		options.skipEventRequest = _.isBoolean(options.skipEventRequest) ? options.skipEventRequest : true;

		self.globalOnlyOptions.forEach(globalOnlyOption => delete options[globalOnlyOption]);

		if (options.splash) {
			self._buildSplashRequest(options);
		} else
			self._buildHttpRequest(options);
	}

	queue(options) {
		var self = this;

		// Did you get a single object or string? Make it compatible.
		options = _.isArray(options) ? options : [options];

		options = _.flattenDeep(options);

		for (var i = 0; i < options.length; ++i) {
			if (self.isIllegal(options[i])) {
				log.warn('Illegal queue option: ', JSON.stringify(options[i]));
				continue;
			}
			self._pushToQueue(
				_.isString(options[i]) ? { uri: options[i] } : Object.assign({ uri: options[i].uri || options[i].request.link }, options[i])
			);
		}
	}

	_pushToQueue(options) {
		var self = this;

		// you can use jquery or jQuery
		options = checkJQueryNaming(options);

		_.defaults(options, self.options);
		options.headers = _.assign({}, self.options.headers, options.headers);

		// Remove all the global options from our options
		// TODO we are doing this for every _pushToQueue, find a way to avoid this
		self.globalOnlyOptions.forEach(globalOnlyOption => delete options[globalOnlyOption]);

		// If duplicate skipping is enabled, avoid queueing entirely for URLs we already crawled
		if (!self.options.skipDuplicates) {
			self._schedule(options);
			return;
		}

		if (options.splash) {
			self.splash_seen.exists(options, options.splash_seenreq).then(rst => {
				if (!rst) {
					self._schedule(options);
				}
			}).catch(e => log.error(e));
		} else {
			self.seen.exists(options, options.seenreq).then(rst => {
				if (!rst) {
					self._schedule(options);
				}
			}).catch(e => log.error(e));
		}
	}

	_schedule(options) {
		var self = this;
		//NOTE this will be used to add proxy outside the class
		self.emit('schedule', options);

		self.limiters.key(options.limiter || 'default').submit(options.priority, function (done, limiter) {
			options.release = function () { done(); self.emit('_release'); };
			if (!options.callback)
				options.callback = options.release;

			if (limiter) {
				self.emit('limiterChange', options, limiter);
			}

			if (options.html) {
				self.onContent(null, options, { body: options.html, headers: { 'content-type': 'text/html' } });
			} else if (typeof options.uri === 'function') {
				options.uri(function (uri) {
					options.uri = uri;
					options.request.fetch(self, options);
				});
			} else {
				options.request.fetch(self, options);
			}
		});

	}

	onContent(error, options, response) {
		var self = this;

		if (error) {
			switch (error.code) {
			case 'NOHTTP2SUPPORT':
				//if the enviroment is not support http2 api, all request rely on http2 protocol
				//are aborted immediately no matter how many retry times left
				log.error('Error ' + error + ' when fetching ' + (options.uri || options.url) + ' skip all retry times');
				break;
			default:
				log.error('Error ' + error + ' when fetching ' + (options.uri || options.url) + (options.retries ? ' (' + options.retries + ' retries left)' : ''));
				if (options.retries) {
					setTimeout(function () {
						options.retries--;
						self._schedule(options);
						options.release();
					}, options.retryTimeout);
					return;
				}
				break;
			}

			options.callback(error, { options: options }, options.release);

			return;
		}

		if (!response.body) { response.body = ''; }

		log.debug('Got ' + (options.uri || 'html') + ' (' + response.body.length + ' bytes)...');

		const taiResponse = createResponse(response, options);
		if (options.method === 'HEAD' || !options.jQuery) {
			return options.callback(null, taiResponse, options.release);
		}

		for (let v of options.callback(null, taiResponse, options.release)) {
			// console.log(v);
			let item = v;
			if (item instanceof Request) {
				let curr = Object.assign({}, {
					request: item,
					callback: function (err, res, done) {
						done();
						if (err) {
							log.error(err);
						} else {
							if (item.cb) return item.cb(res);
							else return self.parse(res);
						}
					}
				});
				setTimeout(() => {
					self.queue([curr]);
				}, 100);
			} else if (item instanceof SplashRequest) {
				let curr = Object.assign({}, {
					limiter: 'splash',
					splash: true,
					request: item,
					callback: function (err, res, done) {
						done();
						if (err) {
							log.error(err);
						} else {
							if (item.cb) return item.cb(res);
							else return self.parse(res);
						}
					}
				});
				setTimeout(() => {
					self.queue(curr);
				}, 100);
			} else {
				if (this.pipelines) {
					this.pipelines.forEach(pipeline => {
						item = pipeline.process_item(item, this, options.request, taiResponse);
					});
				}
			}
		}
	}
}

module.exports = TaiSpider;
