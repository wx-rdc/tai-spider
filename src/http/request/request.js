'use strict';

const _ = require('lodash');
const setCookie = require('set-cookie-parser');
const log = require('../../logger');

class Request {

	constructor(options) {
		Object.assign(this, options);
	}

	fetch(spider, options) {
		// log.debug(options.method + ' ' + options.uri);
		if (options.proxy)
			log.debug('Use proxy: %s', options.proxy);

		// Cloning keeps the opts parameter clean:
		// - some versions of "request" apply the second parameter as a
		// property called "callback" to the first parameter
		// - keeps the query object fresh in case of a retry

		var ropts = _.assign(options, this);

		if (!ropts.headers) { ropts.headers = {}; }
		if (ropts.forceUTF8) { ropts.encoding = null; }
		// specifying json in request will have request sets body to JSON representation of value and
		// adds Content-type: application/json header. Additionally, parses the response body as JSON
		// so the response will be JSON object, no need to deal with encoding
		if (ropts.json) { options.encoding = null; }
		if (ropts.userAgent) {
			if (spider.options.rotateUA && _.isArray(ropts.userAgent)) {
				ropts.headers['User-Agent'] = ropts.userAgent[0];
				// If "rotateUA" is true, rotate User-Agent
				options.userAgent.push(options.userAgent.shift());
			} else {
				ropts.headers['User-Agent'] = ropts.userAgent;
			}
		}

		if (ropts.referer) {
			ropts.headers.Referer = ropts.referer;
		}

		if (ropts.proxies && ropts.proxies.length) {
			ropts.proxy = ropts.proxies[0];
		}

		var doRequest = function (err) {
			if (err) {
				err.message = 'Error in preRequest' + (err.message ? ', ' + err.message : err.message);
				switch (err.op) {
				case 'retry': log.debug(err.message + ', retry ' + options.uri); spider.onContent(err, options); break;
				case 'fail': log.debug(err.message + ', fail ' + options.uri); options.callback(err, { options: options }, options.release); break;
				case 'abort': log.debug(err.message + ', abort ' + options.uri); options.release(); break;
				case 'queue': log.debug(err.message + ', queue ' + options.uri); spider.queue(options); options.release(); break;
				default: log.debug(err.message + ', retry ' + options.uri); spider.onContent(err, options); break;
				}
				return;
			}

			if (ropts.skipEventRequest !== true) {
				spider.emit('request', ropts);
			}

			var requestArgs = ['uri', 'url', 'qs', 'method', 'headers', 'body', 'form', 'formData', 'json', 'multipart', 'followRedirect', 'followAllRedirects', 'maxRedirects', 'removeRefererHeader', 'encoding', 'pool', 'timeout', 'proxy', 'auth', 'oauth', 'strictSSL', 'jar', 'aws', 'gzip', 'time', 'tunnel', 'proxyHeaderWhiteList', 'proxyHeaderExclusiveList', 'localAddress', 'forever', 'agent', 'strictSSL', 'agentOptions', 'agentClass'];

			spider.httpClient.request(_.pick.apply(spider, [ropts].concat(requestArgs)), function (error, response) {
				if (error) {
					return spider.onContent(error, options);
				}

				if (response.statusCode === 308) {
					process.nextTick(() => {
						options.release();
						spider.queue({
							uri: response.headers['location'],
							request: options.request,
							callback: options.callback
						});
					});
					return;
				}

				response.cookies = setCookie.parse(response);

				if (options.noContent) {
					return options.callback(error, response, () => { });
				}

				spider.onContent(error, options, response);
			});
		};

		if (options.preRequest && _.isFunction(options.preRequest)) {
			options.preRequest(ropts, doRequest);
		} else {
			doRequest();
		}
	}

}

module.exports = Request;

// fetch("https://www.space-track.org/auth/login", {
// 	"headers": {
// 		"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
// 		"accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
// 		"cache-control": "max-age=0",
// 		"content-type": "application/x-www-form-urlencoded",
// 		"sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"96\", \"Google Chrome\";v=\"96\"",
// 		"sec-ch-ua-mobile": "?0",
// 		"sec-ch-ua-platform": "\"Linux\"",
// 		"sec-fetch-dest": "document",
// 		"sec-fetch-mode": "navigate",
// 		"sec-fetch-site": "same-origin",
// 		"sec-fetch-user": "?1",
// 		"upgrade-insecure-requests": "1",
// 		"cookie": "chocolatechip=gtilsonqbi3fs1gdgvkdcrnghcotsvot; spacetrack_csrf_cookie=4ccefa89635e69eff80774aa7746b8e2",
// 		"Referer": "https://www.space-track.org/auth/login",
// 		"Referrer-Policy": "strict-origin-when-cross-origin"
// 	},
// 	"body": "spacetrack_csrf_token=4ccefa89635e69eff80774aa7746b8e2&identity=ximig&password=Kong059Kong059Kong059&btnLogin=LOGIN",
// 	"method": "POST"
// });