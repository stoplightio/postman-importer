const supportedFormats = {
	RAML: {
		name: 'RAML',
		className: 'RAML',
		formats: ['yaml'],
		import: true,
		export: true
	},
	OAS20: {
		name: 'OAS 2.0',
		className: 'OAS20',
		formats: ['json', 'yaml'],
		import: true,
		export: true
	},
	OAS30: {
		name: 'OAS 3.0.0',
		className: 'OAS30',
		formats: ['yaml'],
		import: false,
		export: true
	}
};

module.exports = supportedFormats;
