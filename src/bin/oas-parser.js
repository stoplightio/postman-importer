#!/usr/bin/env node --harmony
const program = require('commander');
const parser = require('swagger-parser');
const util = require('./util');

let file = undefined;

program
	.arguments('<file>')
	.action(f => {
		file = f;
	})
	.parse(process.argv);

if (typeof file === 'undefined') util.exit('File path required. See --help.');

parser.validate(file).then(() => {
	parser.parse(file)
		.then((api) => console.log(util.stringify(api)))
		.catch(util.exit);
}).catch(util.exit);
