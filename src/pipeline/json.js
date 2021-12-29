'use strict';

const fs = require('fs');

class JsonWriterPipeline {

	open_spider(spider) {
		if (spider.options.jl)
			this.file = fs.createWriteStream(spider.options.filename);
	}

	close_spider(/* eslint-disable no-unused-vars */ spider) {
		if (spider.options.jl && this.file)
			this.file.end();
	}

	process_item(item, /* eslint-disable no-unused-vars */ spider) {
		if (spider.options.jl && this.file) {
			let line = JSON.stringify(item) + '\n';
			this.file.write(line);
		}
		return item;
	}
}

module.exports = JsonWriterPipeline;