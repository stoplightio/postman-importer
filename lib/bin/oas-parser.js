#!/usr/bin/env node --harmony
'use strict';

var program = require('commander');
var parser = require('swagger-parser');
var util = require('./util');

var file = undefined;

program.arguments('<file>').action(function (f) {
	file = f;
}).parse(process.argv);

if (typeof file === 'undefined') util.exit('File path required. See --help.');

parser.validate(file).then(function () {
	parser.parse(file).then(function (api) {
		return console.log(util.stringify(api));
	}).catch(util.exit);
}).catch(util.exit);
