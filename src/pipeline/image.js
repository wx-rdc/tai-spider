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
            } catch (error) { }
        }
    }

    process_item(item, /* eslint-disable no-unused-vars */ spider) {
        const hash = (str) => {
            const hashFn = crypto.createHash('md5');
            hashFn.update(str);
            return hashFn.digest('hex');
        };

        let filename = item.filename || hash(item.url) + "." + item.type;
        if (item instanceof Image) {
            fs.createWriteStream(path.join(this.outputDir, filename)).write(item.body);
        }
        return item;
    }

}

module.exports = ImageWriterPipeline;