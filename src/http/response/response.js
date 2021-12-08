'use strict';

const fs = require('fs');
const { Request, SplashRequest } = require('../request');
const urljoin = require('../../util/urljoin');

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

	follow_all(links, cb, options) {
		return links.map((idx, link) => this.follow(link, cb, options));
	}

	follow(link, cb, options) {
		let linkOptions = this._parse_link(link);
		return new Request({
			link: urljoin(this.options.uri, linkOptions.href),
			options: Object.assign(linkOptions, options || {}),
			cb
		});
	}

	capture_all(links, options) {
		return links.map((idx, link) => this.capture(link, options));
	}

	capture(link, options) {
		let linkOptions = this._parse_link(link);
		return new SplashRequest(Object.assign(linkOptions, options || {}, {
			link: urljoin(this.options.uri, linkOptions.href),
		}));
	}

	download(link, options) {
		let linkOptions = this._parse_link(link);
		return new Request({
			download: true,
			link: urljoin(this.options.uri, linkOptions.href),
			options: Object.assign(linkOptions, options || {}),
			cb: function* () {
				yield options.extData || {};
			}
		});
	}

	saveHtml() {
		fs.writeFileSync('test.html', this.body);
	}
}

module.exports = Response;