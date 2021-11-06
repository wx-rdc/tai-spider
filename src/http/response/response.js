'use strict';

const Request = require('../request');
const urljoin = require('../../util/urljoin');

class Response {

	constructor(response, options) {
		response.options = options;
		Object.assign(this, response);
	}

	follow_all(links, cb, options) {
		return links.map((idx, link) => this.follow(link, cb, options));
	}

	follow(link, cb, options) {
		let linkOptions = {};
		let linkUrl = '';
		if (typeof (link) === 'string') {
			linkUrl = link;
		} else {
			linkUrl = link.attribs['href'];
			linkOptions['anchorText'] = link.children[0].data;
		}
		return new Request({
			link: urljoin(this.options.uri, linkUrl),
			options: Object.assign(linkOptions, options || {}),
			cb
		});
	}
}

module.exports = Response;