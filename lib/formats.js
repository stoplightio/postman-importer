const supportedFormats = {
	'RAML10': {
		name: 'RAML 1.0',
		className: 'RAML10',
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
