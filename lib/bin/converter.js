#!/usr/bin/env node --harmony
'use strict';

var program = require('commander');
var util = require('./util');
var formats = require('../formats');
var specConverter = require('../index');

var from = formats.OAS20;
var to = formats.RAML;
var validate = false;
var file = undefined;

program.arguments('<file>').option('-f, --from <from>', 'the from/input spec, valid values are: RAML, OAS20 (default)').option('-t, --to <to>', 'the to/target spec, valid values are: OAS20, RAML (default)').option('-v, --validate <validate>', 'true to validate the output (defaults to false)').action(function (f) {
	file = f;
	if (typeof program.from !== 'undefined') {
		from = formats[program.from.toUpperCase()];
		if (typeof from === 'undefined') util.exit('Invalid --from spec given. See --help.');
	}
	if (typeof program.to !== 'undefined') {
		to = formats[program.to.toUpperCase()];
		if (typeof to === 'undefined') util.exit('Invalid --to spec given. See --help.');
	}
	if (typeof program.validate !== 'undefined') {
		validate = program.validate;
	}
}).parse(process.argv);

if (typeof file === 'undefined') util.exit('File path required. See --help.');

var converter = new specConverter.Converter(from, to);
converter.convertFile(file, { validate: validate }).then(function (result) {
	return console.log(util.stringify(result));
}).catch(util.exit);