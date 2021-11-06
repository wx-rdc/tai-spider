'use strict';

const http2 = require('http2');
const qs = require('querystring');
const log = require('../logger');

const http2Request = {
	_generateHttp2RequestLine: (options) => {
		const urlObj = new URL(options.uri);

		const requestLine = {
			':method': options.method || 'GET',
			':path': urlObj.pathname,
			':scheme': urlObj.protocol.replace(':', ''),
			':authority': urlObj.hostname
		};

		return requestLine;
	},

	_generateHttp2RequestBody: (options) => {
		let data = null;
		if (options.form) {
			if (!/^application\/x-www-form-urlencoded\b/.test(options.headers['content-type'])) {
				options.headers['content-type'] = 'application/x-www-form-urlencoded';
			}

			data = (typeof options.form === 'string') ? encodeURIComponent(options.form) : qs.stringify(options.form);
		} else if (options.json) {
			if (!/^application\/x-www-form-urlencoded\b/.test(options.headers['content-type'])) {
				data = JSON.stringify(options.body);
			}

			if (!options.headers['contentn-type']) options.headers['content-type'] = 'application/json';

		} else if (options.body !== undefined) {
			data = options.body;
		}

		//NOTE  the default situation do nothing to the
		return data;
	},

	_buildHttp2Session: (targetHost) => {

		const newHttp2Connection = http2.connect(targetHost);

		log.debug(`connect to a new ${targetHost}`);

		newHttp2Connection.on('error', (err) => {
			log.warn(`Http2 stession error ${targetHost}, got error ${err}`);
		}).on('goaway', () => {
			log.debug(`Http2 session ${targetHost} connection goaway`);
		}).on('connect', () => {
			log.debug(`Http2 session ${targetHost} connection init`);
		}).once('close', () => {
			log.debug(`Http2 session ${targetHost} connection closed`);
		});

		return newHttp2Connection;
	},

	_clearHttp2Session() {
		log.debug(`Crawler clear all ${Object.keys(this.http2Connections).length} http2 connections`);
		Object.keys(this.http2Connections).forEach(hostName => {
			this._closeAndDeleteHttp2Session(hostName);
			log.debug(`http2 connection to ${hostName} closed`);
		});
	},

	_closeAndDeleteHttp2Session(targetHost) {
		if (this.http2Connections[targetHost]) {
			this.http2Connections[targetHost].close();
			delete this.http2Connections[targetHost];
		}
	},

	request: (options, cb) => {
		const targetHost = new URL(options.uri).origin;
		options.headers = Object.assign(options.headers, http2Request._generateHttp2RequestLine(options));
		const requestBody = options.headers[':method'] === 'GET' ? null : http2Request._generateHttp2RequestBody(options);
		const response = {
			headers: {}
		};
		const chunks = [];
		let http2Error = null;

		let http2Session = options.http2Session || http2Request._buildHttp2Session(targetHost);
		options.http2Session = http2Session;

		let req = null;
		try {
			req = http2Session.request(options.headers);
		} catch (e) {
			//to handle the goaway issue， goaway will make the session can not be established
			//but it can not be detected at the moment that stream init
			//try catch seems the way to sovle it
			cb(e, options, response);
			return;
		}

		req.on('response', headers => {
			//Where build the response obj
			response.statusCode = headers[':status'];
			response.httpVersion = '2.0';
			response.request = {
				uri: `${req.sentHeaders[':scheme']}://${req.sentHeaders[':authority']}${req.sentHeaders[':path']}`,
				method: req.sentHeaders[':method'],
				headers: Object.assign({}, req.sentHeaders, req.sentInfoHeaders)
			};
			for (const name in headers) {
				response.headers[name] = headers[name];
			}
		});

		req.on('error', (err) => {
			log.debug(`Http2 stream error${options.uri}, got error ${err}`);
			http2Error = err;
		});

		req.on('data', chunk => {
			chunks.push(chunk);
		});

		req.setTimeout(options.timeout);

		req.on('timeout', () => {
			const error = new Error('ESOCKETTIMEDOUT');
			error.code = 'ESOCKETTIMEDOUT';
			http2Error = error;
			req.close();
		});

		req.once('close', () => {
			if (http2Error) cb(http2Error, { options });
			else {
				response.body = Buffer.concat(chunks);
				cb(null, response);
			}
		});

		req.on('end', () => {
			// http2Session.close();
			log.debug(`${options.uri} stream ends`);
		});

		//set request body
		req.end(requestBody);
	}
};

module.exports = http2Request;