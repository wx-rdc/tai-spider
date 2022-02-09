const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const requireDirectory = require('require-directory');
const { Request, SplashRequest } = require('./http/request');

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

		let start_urls = [];
		if (typeof spider.start_urls === 'function')
			start_urls = spider.start_urls();
		else
			start_urls = spider.start_urls;
		start_urls.forEach(url => {
			if (typeof url === 'string') {
				debug('start url: %s', url);
				const { headers = {} } = spider;
				spider.processRequest(
					new Request({
						link: url,
						headers,
						skipDuplicates: false,
						direct: true,
					}),
					spider
				);
			} else if (typeof url === 'object') {
				let options = url;
				let request = options.splash ? SplashRequest : Request;
				spider.processItem(new request(options), spider);
			} else {
				error('unknow url type, exist with error');
				process.exit(1);
			}
			// spider.queue([{
			// 	skipDuplicates: false,
			// 	request: new Request({ link: url, headers }),
			// 	callback: function (err, res, done) {
			// 		done();
			// 		if (err) {
			// 			spider.errorHandle(err);
			// 		} else {
			// 			spider.clearErrors();
			// 			return spider.parse(res);
			// 		}
			// 	},
			// }]);
		});
	});

	// start init
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
if (options.output) debug('  output: %s', options.output);

let defaultOptions = require(path.join(process.cwd(), 'config', 'default.js'))();
debug('Default options: ', defaultOptions);

if (fs.existsSync(path.join(process.cwd(), 'config', 'setting.json'))) {
	const settingOptions = require(path.join(process.cwd(), 'config', 'setting.json'));
	debug('Setting options: ', settingOptions);
	defaultOptions = Object.assign(defaultOptions, settingOptions);
}

var spiders = requireDirectory(module, path.join(process.cwd(), 'spider'));

pkgs.forEach(function (pkg) {
	if (pkg in spiders) {
		debug('run spider: ', pkg);
		var pipelines = [];

		// json line output enabled
		var jl = false;
		if (options.output) {
			jl = true;
		}

		pipelines.push(require('./pipeline/store'));
		pipelines.push(require('./pipeline/json'));
		pipelines.push(require('./pipeline/echo'));

		if (defaultOptions.ds) {
			const dsName = defaultOptions.ds.split(':')[0];
			console.log('load pipeline: ', dsName)
			pipelines.push(require(path.join(process.cwd(), 'pipeline', dsName)));
		}

		let spider = new spiders[pkg](Object.assign({
			debug: true,
			jl,
			filename: options.output,
			pipelines,
		}, defaultOptions));
		runSpider(spider);
	} else
		error('Not found spider ', pkg);
});