#!/usr/bin/env node

const { program } = require('commander');
const { version, description } = require('../package.json');

program
    .version(version)
    .description(description)
    .command('run [name]', 'run spider').alias('r');

program.parse(process.argv);