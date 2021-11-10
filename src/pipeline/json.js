'use strict';

const fs = require('fs');

class JsonWriterPipeline {

	open_spider(spider) {
		this.file = fs.createWriteStream(spider.options.filename);
	}

	close_spider(/* eslint-disable no-unused-vars */ spider) {
		this.file.end();
	}

	process_item(item, /* eslint-disable no-unused-vars */ spider) {
		let line = JSON.stringify(item) + '\n';
		this.file.write(line);
		return item;
	}
}

module.exports = JsonWriterPipeline;