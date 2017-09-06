#!/usr/bin/env node --harmony
'use strict';

var program = require('commander');
var parser = require('raml-1-parser');
var util = require('./util');

var expand = true;
var mode = '0';
var file = undefined;

program.arguments('<file>').option('-e, --expand <expand>', 'whether to expand (default) or not').option('-m, --mode <mode>', 'Mode 0 (default): reject on errors. Mode 1: get errors from json.').action(function (f) {
	file = f;
	if (typeof program.expand !== 'undefined') expand = program.expand;
	if (typeof program.mode !== 'undefined') mode = program.mode;
}).parse(process.argv);

if (typeof file === 'undefined') util.exit('File path required. See --help.');

switch (mode) {
	case '1':
		parser.loadApi(file, {
			attributeDefaults: false,
			rejectOnErrors: false
		}).then(function (api) {
			if (expand && api.expand) api = api.expand(true);

			var json = api.toJSON({
				serializeMetadata: false,
				dumpSchemaContents: false,
				rootNodeDetails: true
			});

			if (json.errors && json.errors.length) util.exit(util.stringify(json.errors));else console.log(util.stringify(json.specification));
		}).catch(util.exit);
		break;
	default:
		parser.loadApi(file, {
			attributeDefaults: false,
			rejectOnErrors: true
		}).then(function (api) {
			if (expand && api.expand) api = api.expand(true);

			var json = api.toJSON({
				serializeMetadata: false
			});

			console.log(util.stringify(json));
		}).catch(util.exit);
		break;
}