'use strict';

const fs = require('fs');
const _ = require('lodash');
const { Request, SplashRequest } = require('../request');
const urljoin = require('../../util/urljoin');
const ItemNodes = require('../node/items');

class Response {

	constructor(response, options) {
		response.options = options;
		Object.assign(this, response);
	}

	_parse_link(link) {
		let linkOptions = {};
		let linkUrl = '';
		if (typeof (link) === 'string') {
			linkUrl = link;
		} else {
			linkUrl = link.attr('href');
			linkOptions['anchorText'] = link.extract();
		}
		linkOptions.href = linkUrl;
		return linkOptions;
	}

	getUri() {
		return this.options.uri;
	}

	from_request(options) {
		let request = options.splash ? SplashRequest : Request;
		return new request(options);
	}

	follow_all(links, cb, options) {
		return links.map((idx, link) => this.follow(link, cb, options));
	}

	follow(link, cb, options = {}) {
		let singleLink = link instanceof ItemNodes ? link.get(0) : link;
		if (!singleLink) return {};
		let linkOptions = this._parse_link(singleLink);
		let request = options.splash ? SplashRequest : Request;
		return new request(Object.assign({
			link: urljoin(this.options.uri, linkOptions.href),
			cb,
		}, _.merge({
			options: linkOptions,
		}, options))
		);
	}

	absolute_url(url) {
		return urljoin(this.options.uri, url);
	}

	// capture_all(links, options) {
	// 	return links.map((idx, link) => this.capture(link, options));
	// }

	// capture(link, options) {
	// 	let linkOptions = this._parse_link(link);
	// 	return new SplashRequest(Object.assign(linkOptions, options || {}, {
	// 		link: urljoin(this.options.uri, linkOptions.href),
	// 	}));
	// }

	// download(link, options) {
	// 	let linkOptions = this._parse_link(link);
	// 	return new Request({
	// 		download: true,
	// 		link: urljoin(this.options.uri, linkOptions.href),
	// 		options: Object.assign(linkOptions, options || {}),
	// 		cb: function* () {
	// 			yield options.extData || {};
	// 		}
	// 	});
	// }

	saveBody(filename) {
		fs.writeFileSync(filename, this.body);
	}
}

module.exports = Response;