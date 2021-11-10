'use strict';

var crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class StorePipeline {

	open_spider(spider) {
		this.outputDir = spider.envs['FILE_STORE'];
		if (this.outputDir) {
			try {
				fs.mkdirSync(this.outputDir);
			} catch (error) { /* eslint-disable no-empty */ }
		}
	}

	process_item(item, /* eslint-disable no-unused-vars */ spider, request, response) {
		const hash = (str) => {
			const hashFn = crypto.createHash('md5');
			hashFn.update(str);
			return hashFn.digest('hex');
		};

		if (request && request.download) {
			let options = request.options;
			let filename = options.filename || hash(request.link) + '.' + options.type;
			fs.createWriteStream(path.join(this.outputDir, filename)).write(response.body);
			if (options.cb)
				item = Object.assign(item, options.cb(filename));
			else
				item = Object.assign(item, {
					file: {
						name: filename,
					}
				});
		}
		return item;
	}

}

module.exports = StorePipeline;