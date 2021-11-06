'use strict';

var log4js = require('log4js');

log4js.configure({
	appenders: {
		console: { type: 'console' },
		taispiderLogs: { type: 'file', filename: 'logs/taispider.log', category: 'taispider' }
	},
	categories: {
		default: { appenders: ['console', 'taispiderLogs'], level: 'info' }
	}
});

var logger = log4js.getLogger('taispider');

module.exports = logger;