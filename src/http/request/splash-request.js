'use strict';

const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
var crypto = require('crypto');
const _ = require('lodash');
const splash = require('../splash');
const log = require('../../logger');

class SplashRequest {

	constructor(options) {

		var defaultOptions = {
			render_all: 1,
			wait: 1,
			headers: {
				'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
			}
		};

		const hash = (str) => {
			const hashFn = crypto.createHash('md5');
			hashFn.update(str);
			return hashFn.digest('hex');
		};

		Object.assign(this, defaultOptions, options);

		this.filename = this.filename || hash(options.link) + '.png';
	}

	fetch(spider, options) {
		var self = spider;
		var outputDir = self.envs['CAPTURE_STORE'];
		var splashServer = self.envs['SPLASH_SERVER'];

		if (!splashServer)
			throw new Error('Please set SPLASH_SERVER first!');

		if (!fs.existsSync(outputDir)) {
			try {
				mkdirp.sync(outputDir);
			} catch (error) { /* eslint-disable no-empty */ }
		}

		// log.debug(options.method + ' ' + options.uri);
		if (options.proxy)
			log.debug('Use proxy: %s', options.proxy);

		// Cloning keeps the opts parameter clean:
		// - some versions of "request" apply the second parameter as a
		// property called "callback" to the first parameter
		// - keeps the query object fresh in case of a retry

		var ropts = _.assign({}, options);

		ropts.headers = {};
		ropts.encoding = null;

		if (ropts.proxies && ropts.proxies.length) {
			ropts.proxy = ropts.proxies[0];
		}

		var doRequest = function (err) {
			if (err) {
				err.message = 'Error in preRequest' + (err.message ? ', ' + err.message : err.message);
				switch (err.op) {
				case 'retry': log.debug(err.message + ', retry ' + options.uri); self.onContent(err, options); break;
				case 'fail': log.debug(err.message + ', fail ' + options.uri); options.callback(err, { options: options }, options.release); break;
				case 'abort': log.debug(err.message + ', abort ' + options.uri); options.release(); break;
				case 'queue': log.debug(err.message + ', queue ' + options.uri); self.queue(options); options.release(); break;
				default: log.debug(err.message + ', retry ' + options.uri); self.onContent(err, options); break;
				}
				return;
			}

			if (ropts.skipEventRequest !== true) {
				self.emit('request', ropts);
			}

			const { filename, link, cb } = options.request;
			const rest = _.omit(options.request, 'filename', 'link', 'cb');

			log.debug('capture %s', link);

			splash.capture(link, Object.assign({}, rest, {
				splash_server: splashServer,
			})).then(body => {
				fs.createWriteStream(path.join(outputDir, filename)).write(body);
				// return self._onContent(error, options, response);
				options.release();
				if (cb) cb({
					link,
					filename
				});
			}).catch(error => {
				// return self._onContent(error, options);
				log.error(error);
				options.release();
			});
		};

		if (options.preRequest && _.isFunction(options.preRequest)) {
			options.preRequest(ropts, doRequest);
		} else {
			doRequest();
		}
	}
}

module.exports = SplashRequest;