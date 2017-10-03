#!/usr/bin/env node --harmony
const program = require('commander');
const parser = require('raml-1-parser');
const util = require('./util');

let expand = true;
let mode = '0';
let file = undefined;

program
	.arguments('<file>')
	.option('-e, --expand <expand>', 'whether to expand (default) or not')
	.option('-m, --mode <mode>', 'Mode 0 (default): reject on errors. Mode 1: get errors from json.')
	.action(f => {
		file = f;
		if (typeof program.expand !== 'undefined')
			expand = program.expand;
		if (typeof program.mode !== 'undefined')
			mode = program.mode;
	})
	.parse(process.argv);

if (typeof file === 'undefined') util.exit('File path required. See --help.');

switch (mode) {
	case '1':
		parser.loadApi(file, {
			attributeDefaults: false,
			rejectOnErrors: false
		}).then((api) => {
			if (expand && api.expand) api = api.expand(true);

			const json = api.toJSON({
				serializeMetadata: false,
				dumpSchemaContents: false,
				rootNodeDetails: true
			});

			if (json.errors && json.errors.length)
				util.exit(util.stringify(json.errors));
			else
				console.log(util.stringify(json.specification));

		}).catch(util.exit);
		break;
	default:
		parser.loadApi(file, {
			attributeDefaults: false,
			rejectOnErrors: true
		}).then((api) => {
			if (expand && api.expand) api = api.expand(true);

			const json = api.toJSON({
				serializeMetadata: false
			});

			console.log(util.stringify(json));

		}).catch(util.exit);
		break;
}
