'use strict';

class EchoPipeline {

	process_item(item, spider) {
		let echo_flag = spider.envs['ECHO'] === undefined ? true : spider.envs['ECHO'];
		if (echo_flag)
			console.log(JSON.stringify(item));
		return item;
	}
}

module.exports = EchoPipeline;