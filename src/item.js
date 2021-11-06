'use strict';

const _ = require('lodash');

const $fields = Symbol('fields');

class Item {
	constructor(options) {
		const defaultOption = {
			type: 'string',
			process: (node, type) => {
				if (type === 'string')
					return _.trim(node.text());
				else if (type === 'date')
					return new Date(_.trim(node.text()));
			},
		};
		this[$fields] = {};
		Object.keys(options).forEach((key) => {
			if (typeof (options[key]) === 'string') {
				this[$fields][key] = Object.assign({}, defaultOption, { value: options[key] });
			} else {
				this[$fields][key] = Object.assign({}, defaultOption, options[key]);
			}
		});
	}

	getFieldNames() {
		return Object.keys(this[$fields]);
	}

	getFieldOption(key) {
		return this[$fields][key];
	}

	getValue(key, res) {
		let option = this.getFieldOption(key);
		let value = res.css(option.value);
		return option.process(value, option.type);
	}
}

module.exports = Item;