'use strict';

const _ = require('lodash');

const splitWithTrim = (str, sep) => {
	const ret = [];
	str.split(sep).forEach(item => {
		let t = item.trim();
		if (t.length > 0) {
			ret.push(t);
		}
	});
	return ret;
};

class TableParser {
	constructor(node, $) {
		this.node = node;
		this.$ = $;
	}

	parse({ direct = 'horizontal', fieldNameMap }) {
		const { $, node } = this;
		let dupRows = false,
			dupCols = false;
		var columns = [],
			curr_x = 0,
			curr_y = 0;

		$('tr', node).each(function (row_idx, row) {
			curr_y = 0;
			$('td, th', row).each(function (col_idx, col) {
				var rowspan = $(col).attr('rowspan') || 1;
				var colspan = $(col).attr('colspan') || 1;
				var content = $(col).text().trim() || '';

				if (row_idx === 0 && content.length === 0 && direct === 'horizontal')
					content = `_col${col_idx}`;

				var x = 0,
					y = 0;
				for (x = 0; x < rowspan; x++) {
					for (y = 0; y < colspan; y++) {
						if (columns[curr_y + y] === undefined) {
							columns[curr_y + y] = [];
						}

						while (columns[curr_y + y][curr_x + x] !== undefined) {
							curr_y += 1;
							if (columns[curr_y + y] === undefined) {
								columns[curr_y + y] = [];
							}
						}

						if ((x === 0 || dupRows) && (y === 0 || dupCols)) {
							columns[curr_y + y][curr_x + x] = content;
						} else {
							columns[curr_y + y][curr_x + x] = '';
						}
					}
				}
				curr_y += 1;
			});
			curr_x += 1;
		});

		if (direct === 'horizontal') return this.transHorizontal(columns, fieldNameMap);
		if (direct === 'vertical') return this.transVertical(columns, fieldNameMap);

		return columns;
	}

	parseValue(val, type, options = {}) {
		if (type === 'string') {
			return val;
		} else if (type === 'date') {
			return new Date(val);
		} else if (type === 'array') {
			return splitWithTrim(val, options.sep);
		}
		let parseFunc = 'parse' + _.upperFirst(type);
		return global[parseFunc](val);
	}

	transHorizontal(columns, fieldNameMap) {
		let width = columns.length;
		let height = columns[0].length;
		let result = [];

		for (let j = 1; j < height; j++) {
			let record = {};
			for (let i = 0; i < width; i++) {
				let item = fieldNameMap.filter(item => item.dn === columns[i][0])[0];
				record[item.fn] = this.parseValue(columns[i][j], item.type || 'string', item.options);
			}
			result.push(record);
		}
		return result;
	}

	transVertical(columns, fieldNameMap) {
		let width = columns.length;
		let height = columns[0].length;
		let result = [];

		if (width !== 2) return columns;

		let record = {};
		for (let j = 0; j < height; j++) {
			let item = fieldNameMap.filter(item => item.dn === columns[0][j])[0];
			record[item.fn] = this.parseValue(columns[1][j], item.type || 'string');
		}
		result.push(record);
		return result;
	}
}

module.exports = TableParser;