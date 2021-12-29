'use strict';

const iconvLite = require('iconv-lite');
const cheerio = require('cheerio');
const extractor = require('unfluff');
const Response = require('./response');
const ItemNodes = require('../node/items');

class TextResponse extends Response {

	constructor(response, options) {
		super(response, options);

		this._doEncoding(options);

		var defaultCheerioOptions = {
			normalizeWhitespace: false,
			xmlMode: false,
			decodeEntities: true
		};
		var cheerioOptions = options.jQuery.options || defaultCheerioOptions;
		this.$ = cheerio.load(this.body, cheerioOptions);
	}

	_doEncoding(options) {
		// if (options.encoding === null) {
		// 	return;
		// }

		if (options.forceUTF8) {
			var charset = this.charset;

			if (charset !== 'utf-8' && charset !== 'ascii') {
				// convert response.body into 'utf-8' encoded buffer
				this.body = iconvLite.decode(this.body, charset);
			}
		}

		this.body = this.body.toString();
	}

	css(path) {
		return new ItemNodes(this.$(path), this.$);
	}

	extract() {
		return extractor(this.body);
	}

}

module.exports = TextResponse;