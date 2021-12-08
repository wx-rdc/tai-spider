'use strict';

const crypto = require('crypto');

function transformKey(key) {
	const hash = (str) => {
		const hashFn = crypto.createHash('md5');
		hashFn.update(str);
		return hashFn.digest('hex');
	};

	return hash(key);
}

module.exports = {
	transformKey,
};