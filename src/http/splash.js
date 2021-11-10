'use strict';

const request = require('request');
const urljoin = require('../util/urljoin');
const _ = require('lodash');

const splash = {

	capture: (url, options) => {

		const { splash_server } = options;
		const rest = _.omit(options, 'splash_server');

		return new Promise((resolve, reject) => {
			request({
				method: 'GET',
				url: urljoin(splash_server, '/render.png'),
				qs: Object.assign({}, rest, {
					url,
				}),
				encoding: null,
			}, function (error, response) {
				if (!error && response.statusCode == 200) {
					resolve(response.body);
				} else {
					reject(response.statusCode + ': ' + response.statusMessage);
				}
			});
		});
	}
};

module.exports = splash;