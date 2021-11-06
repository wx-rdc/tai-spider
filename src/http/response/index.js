'use strict';

const typeis = require('type-is').is;
const DefaultResponse = require('./default-response');
const TextResponse = require('./text-response');
const log = require('../../logger');

function contentType(res) {
	return get(res, 'content-type').split(';').filter(item => item.trim().length !== 0).join(';');
}

function get(res, field) {
	return res.headers[field.toLowerCase()] || '';
}

function parseCharset(res) {
	//Browsers treat gb2312 as gbk, but iconv-lite not.
	//Replace gb2312 with gbk, in order to parse the pages which say gb2312 but actually are gbk.
	function getCharset(str) {
		var charset = (str && str.match(/charset=['"]?([\w.-]+)/i) || [0, null])[1];
		return charset && charset.replace(/:\d{4}$|[^0-9a-z]/g, '') == 'gb2312' ? 'gbk' : charset;
	}
	function charsetParser(header, binary, default_charset = null) {
		return getCharset(header) || getCharset(binary) || default_charset;
	}

	var charset = charsetParser(contentType(res));
	if (charset)
		return charset;

	if (!typeis(contentType(res), ['html'])) {
		log.debug('Charset not detected in response headers, please specify using `incomingEncoding`, use `utf-8` by default');
		return 'utf-8';
	}

	var body = res.body instanceof Buffer ? res.body.toString() : res.body;
	charset = charsetParser(contentType(res), body, 'utf-8');

	return charset;
}

const createResponse = (response, options) => {

	var htmlTypes = ['html', 'xhtml', 'text/xml', 'application/xml', '+xml'];
	if (typeis(contentType(response), htmlTypes)) {
		response.charset = options.incomingEncoding || parseCharset(response);
		return new TextResponse(response, options);
	}

	return new DefaultResponse(response, options);
};

module.exports = {
	createResponse,
};