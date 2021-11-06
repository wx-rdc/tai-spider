const path = require('path');
const fs = require('fs');

const localSrc = path.join(__dirname, 'src');
var libPath = path.join(__dirname, 'lib');
if (fs.existsSync(localSrc)) {
  libPath = localSrc;
}

exports = module.exports = {
  TaiSpider: require(path.join(libPath, 'taispider')),
  Item: require(path.join(libPath, 'item')),
  ItemLoader: require(path.join(libPath, 'item-loader')),
  urljoin: require(path.join(libPath, 'util/urljoin')),
  types: require(path.join(libPath, 'types')),
};

/*
  Export the version
*/

exports.version = require('./package').version;