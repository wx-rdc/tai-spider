'use strict';

const tls = require('tls');
const URL = require('url').URL;
const http = require('request');
const http2 = require('./http2');
const log = require('../logger');

const $hosts = Symbol('hosts');

class HttpClient {

	constructor() {
		this[$hosts] = {};
	}

	request(options, cb) {

		if (/^\/\//.test(options.uri)) {
			options.uri = 'https:' + options.uri;
		}

		if (!options.http2 || options.proxy || options.uri.startsWith('http:')) {
			// force use http 1.1
			this._makeHttpRequest(options, cb);
		} else {
			this._detectALPNProtocol(options.uri).then(alpnProtocol => {
				if (alpnProtocol === 'h2') {
					// use http2
					this._makeHttp2Request(options, cb);
				} else {
					// use http 1.1
					this._makeHttpRequest(options, cb);
				}
			});
		}
	}

	_initializeTLSOptions(servername) {
		let options = {};
		let ALPNProtocols = options.ALPNProtocols = [];
		ALPNProtocols.push('h2');
		ALPNProtocols.push('http/1.1');
		options.servername = servername;
		return options;
	}

	_detectALPNProtocol(uri) {
		var self = this;
		return new Promise((resolve, reject) => {
			try {
				const urlObj = new URL(uri);

				if (urlObj.hostname in self[$hosts]) {
					resolve(self[$hosts][urlObj.hostname].protocol);
					return;
				}

				let port = urlObj.port ? urlObj.port : 443;
				let host = urlObj.hostname;
				let socket = tls.connect(port, host, self._initializeTLSOptions(host), function onConnect() {
					let { alpnProtocol } = socket;
					// log.debug(alpnProtocol);
					socket.end();
					self[$hosts][urlObj.hostname] = {
						protocol: alpnProtocol
					};
					resolve(alpnProtocol);
				});
			} catch (error) {
				log.warn(error);
				reject(error);
			}
		});
	}

	close() {
		http2.clearHttp2Session();
		// Object.keys(this[$hosts]).forEach(host => {
		// 	let option = this[$hosts][host];
		// 	if (option.http2Session) {
		// 		option.http2Session.close();
		// 		delete option.http2Session;
		// 	}
		// });
	}

	_makeHttp2Request(options, cb) {
		// log.debug('use http2');
		// const urlObj = new URL(options.uri);
		// let http2Option = this[$hosts][urlObj.hostname];
		// options.http2Session = http2Option.http2Session;
		let self = this;
		http2.request(options, (error, response) => {
			if (response.statusCode === 301) {
				self._makeHttp2Request(Object.assign(options, {
					uri: response.headers['location']
				}), cb);
			} else {
				cb(error, response);
			}
		});
		// http2Option.http2Session = options.http2Session;
	}

	_makeHttpRequest(options, cb) {
		// log.debug('use http1.1');
		http(options, function (error, response) {
			cb(error, response);
		});
	}
}

module.exports = HttpClient;