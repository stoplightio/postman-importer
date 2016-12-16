const supportedFormats = {
	'AUTO': {
		name: 'Auto',
		className: 'Auto',
		formats: ['json'],
		import: true,
		export: false
	},
	'SWAGGER': {
		name: 'OAS 2.0',
		className: 'Swagger',
		formats: ['json', 'yaml'],
		import: true,
		export: true
	},
	'RAML08': {
		name: 'RAML 0.8',
		className: 'RAML08',
		formats: ['yaml'],
		import: true,
		export: false
	},
	'RAML10': {
		name: 'RAML 1.0',
		className: 'RAML10',
		formats: ['yaml'],
		import: true,
		export: true
	},
	'POSTMAN': {
		name: 'Postman',
		className: 'Postman',
		formats: ['json'],
		import: false,
		export: false
	},
	'STOPLIGHT': {
		name: 'StopLight',
		className: 'StopLight',
		formats: ['json'],
		import: false,
		export: false
	},
	'STOPLIGHTX': {
		name: 'StopLightX',
		className: 'StopLightX',
		formats: ['json'],
		import: false,
		export: false
	}
};

module.exports = supportedFormats;
