'use strict';

const iconvLite = require('iconv-lite');
const Response = require('./response');

class JsonResponse extends Response {

	constructor(response, options) {
		super(response, options);
		this._doEncoding();
	}

	_doEncoding() {
		var charset = this.charset;

		if (charset !== 'utf-8' && charset !== 'ascii') {
			// convert response.body into 'utf-8' encoded buffer
			this.body = iconvLite.decode(this.body, charset);
		}
		this.body = this.body.toString();
	}

	getJSON() {
		return JSON.parse(this.body);
	}

}

module.exports = JsonResponse;