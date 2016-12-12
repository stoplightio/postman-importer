#!/usr/bin/env node --harmony
const program = require('commander');
const parser = require('raml-1-parser');

let expand = true;
let file = undefined;

program
	.arguments('<file>')
	.option('-e, --expand <expand>', 'Whether to expand (default) or not')
	.action(f => {
		file = f;
		if (typeof program.expand !== 'undefined')
			expand = program.expand;
	})
	.parse(process.argv);

const exit = (error) => {
	console.error(error);
	process.exit(1);
};

if (typeof file === 'undefined') exit('File path required. See --help.');


try {
	
	parser.loadApi(file, {
		attributeDefaults: false
	}).then((api) => {
		if (expand && api.expand) {
			api = api.expand(true);
		}
		const json = api.toJSON({
			serializeMetadata: false
		});
		console.log(json);
		
	}).catch(exit);
	
} catch (e) {
	exit(e);
}