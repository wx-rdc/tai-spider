'use strict';

class ItemLoader {

	constructor(response, model) {
		this.response = response;
		this.model = model;
	}

	load_item() {
		let res = this.response;
		let item = {};
		this.model.getFieldNames().forEach(key => {
			item[key] = this.model.getValue(key, res);
		});
		return item;
	}
}

module.exports = ItemLoader;