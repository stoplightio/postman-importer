const supportedFormats = {
	'RAML': {
		name: 'RAML',
		className: 'RAML',
		formats: ['yaml'],
		import: true,
		export: true
	},
	'OAS20': {
		name: 'OAS 2.0',
		className: 'OAS20',
		formats: ['yaml'],
		import: true,
		export: true
	}
};

module.exports = supportedFormats;
