'use strict';

var crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Image = require('../types/image');

class ImageWriterPipeline {

	open_spider(spider) {
		this.outputDir = spider.envs['IMAGES_STORE'];
		if (this.outputDir) {
			try {
				fs.mkdirSync(this.outputDir);
			} catch (error) { /* eslint-disable no-empty */ }
		}
	}

	process_item(item, /* eslint-disable no-unused-vars */ spider) {
		const hash = (str) => {
			const hashFn = crypto.createHash('md5');
			hashFn.update(str);
			return hashFn.digest('hex');
		};

		if (item instanceof Image) {
			let filename = item.filename || hash(item.url) + '.' + item.type;
			fs.createWriteStream(path.join(this.outputDir, filename)).write(item.body);
		}
		return item;
	}

}

module.exports = ImageWriterPipeline;