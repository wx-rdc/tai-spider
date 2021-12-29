'use strict';

const fs = require('fs');
const path = require('path');

class StorePipeline {

	open_spider(spider) {
		this.outputDir = spider.options.store.path;
		if (this.outputDir) {
			try {
				fs.mkdirSync(this.outputDir);
			} catch (error) { /* eslint-disable no-empty */ }
		}
	}

	process_item(item, /* eslint-disable no-unused-vars */ spider, options, response) {
		const { log } = spider;
		const { reqKey, request } = options;

		if (request && request.download) {
			let options = request.options || {};
			const { filename = reqKey, type = 'dat' } = options;
			let fullname = filename + '.' + type;
			log.debug('write to ', fullname);
			fs.createWriteStream(path.join(this.outputDir, fullname)).write(response.body);
			if (options.cb)
				item = Object.assign(item, options.cb(fullname));
			else {
				item = Object.assign(item, {
					file: {
						ref: response.options.uri,
						basename: filename,
						type,
						size: response.body.length,
						fullpath: path.resolve(this.outputDir, fullname)
					}
				});
			}
		}
		return item;
	}

}

module.exports = StorePipeline;