#!/usr/bin/env node

const fs = require('fs');
const path = require('path')
const { program } = require('commander');
const chalk = require('chalk');

const debug = (text) => {
    console.log(chalk.greenBright(text));
}

const warning = (text) => {
    console.log(chalk.keyword('orange')(text));
}

const error = (text) => {
    console.log(chalk.bold.red(text));
}

const localCLI = path.join(__dirname, '../src/run.js');
if (!process.env.FORCE_LIB && fs.existsSync(localCLI)) {
    debug('Using local install of taispider');
    require(localCLI);
} else {
    require('../lib/run');
}
