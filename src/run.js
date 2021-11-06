const { program } = require('commander');
const path = require('path');
const chalk = require('chalk');
const requireDirectory = require('require-directory');

/* eslint-disable */
const debug = (text, ...args) => {
	console.log(chalk.greenBright(text), ...args);
};

const warning = (text, ...args) => {
	console.log(chalk.keyword('orange')(text), ...args);
};

const error = (text, ...args) => {
	console.log(chalk.bold.red(text), ...args);
};
/* eslint-enable */

const runSpider = (spider) => {
	let init_flag = false;
	spider.on('_init_finished', function () {
		init_flag = true;
		spider.start_urls.forEach(url => {
			debug('start url: %s', url);
			spider.queue([{
				uri: url,
				callback: function (err, res, done) {
					done();
					if (err) {
						error(err);
					} else {
						return spider.parse(res);
					}
				}
			}]);
		});
	});
	spider.emit('_init_start');
	setTimeout(() => {
		if (!init_flag) {
			error('Init timeout, exit!');
			process.exit(1);
		}
	}, 1000);
};

program
	.option('-o, --output [filename]', 'output filename');

program.parse(process.argv);

const pkgs = program.args;

if (!pkgs.length) {
	warning('spider name required');
	process.exit(1);
}

const options = program.opts();
if (options.output) console.log('  output: %s', options.output);

var spiders = requireDirectory(module, path.join(process.cwd(), 'spider'));

pkgs.forEach(function (pkg) {
	if (pkg in spiders) {
		debug('run spider: %s', pkg);
		var pipelines = [];
		if (options.output)
			pipelines.push(require('./pipeline/files'));
		else
			pipelines.push(require('./pipeline/echo'));
		pipelines.push(require('./pipeline/image'));
		let spider = new spiders[pkg]({
			debug: true,
			filename: options.output,
			pipelines,
		});
		runSpider(spider);
	} else
		error('Not found spider %s', pkg);
});