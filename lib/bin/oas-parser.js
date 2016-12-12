#!/usr/bin/env node --harmony
const program = require('commander');
const parser = require('swagger-parser');

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
	
	parser.validate(file).then(() => {
		parser.parse(file).then((api) => {
			console.log(api);
		}).catch(exit);
	}).catch(exit);
	
} catch (e) {
	exit(e);
}