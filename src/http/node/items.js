'use strict';

const _ = require('lodash');
const Plugins = require('./plugin');

class ItemNode {
	constructor(node, $) {
		this.$ = $;
		this.node = node;
	}

	extract() {
		return _.trim(this.$(this.node).text());
	}

	attr(prop) {
		return this.$(this.node).attr(prop);
	}

	css(selector) {
		return new ItemNodes(this.$(selector, this.node), this.$);
	}

	next(selector) {
		let nodes = this.$(this.node).nextAll(selector);
		if (nodes && nodes.length > 0)
			return new ItemNode(nodes[0], this.$);
		return null;
	}

	html() {
		return this.$(this.node).html();
	}

	parseTable(fnMap) {
		return (new Plugins.TableParser(this.node, this.$)).parse(fnMap);
	}
}

class ItemNodes {
	constructor(nodes, $) {
		this.nodes = nodes.map((idx, item) => new ItemNode(item, $));
	}

	[Symbol.iterator]() {
		this.current = 0;
		return this;
	}

	map(fn) {
		let arr = [];
		for (let i = 0; i < this.nodes.length; i++) {
			arr.push(fn(i, this.nodes[i], this.nodes));
		}
		return arr;
	}

	next() {
		if (this.current < this.nodes.length)
			return { done: false, value: this.nodes[this.current++] };
		return { done: true, value: undefined };
	}

	get(idx) {
		return this.nodes[idx];
	}

	extract_first() {
		return this.nodes[0].extract();
	}

	extract() {
		let texts = [];
		this.nodes.map((idx, node) => texts.push(node.extract()));
		return texts;
	}

}

module.exports = ItemNodes;