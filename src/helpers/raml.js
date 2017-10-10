const _ = require('lodash');

module.exports = {
	
	getValidCharacters: [
		'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
		'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
		'0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '-', '_'
	],
	
	getReplacementCharacter: '_',
	
	getRAML10ScalarTypes: ['string', 'number', 'integer', 'boolean', 'datetime', 'date-only', 'file', 'array', 'nil', 'time-only', 'datetime-only'],
	getRAML08ScalarTypes: ['string', 'number', 'integer', 'boolean', 'datetime', 'date-only', 'file', 'array', 'null', 'time-only', 'datetime-only'],
	getNumberTypes: ['number' , 'integer'],
	getValidFormat: ['byte', 'binary', 'password', 'date', 'date-time'],
	getAnnotationPrefix: '(',
	getBuiltinTypes : ['string', 'number', 'integer', 'boolean', 'datetime', 'date-only', 'file', 'time-only', 'datetime-only', 'nil', 'null', 'any', 'array', 'object', 'union'],

	parameterMappings: {},
	
	getSupportedParameterFields: [
		'displayName', 'type', 'description', 'default', 'maximum',
		'minimum', 'maxLength', 'minLength', 'pattern', 'enum', 'format',
		'collectionFormat', 'allowEmptyValue', 'exclusiveMaximum', 'exclusiveMinimum',
		'maxItems', 'minItems', 'uniqueItems', 'required', 'facets', 'items', 'example', 'examples',
		'(oas-allowEmptyValue)', '(oas-collectionFormat)', '(oas-exclusiveMaximum)', '(oas-exclusiveMinimum)'
	],

	getRFC3339Format: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.(\d*)Z$/,
	getDateOnlyFormat: /^\d{4}[^-]\d{2}[^-]\d{2}$/,

	isNumberType: function (type) {
		return this.getNumberTypes.indexOf(type) >= 0;
	},

	setParameterFields: function (source, target) {
		for (const prop in source) {
			if (!source.hasOwnProperty(prop)) continue;
			
			if (this.getSupportedParameterFields.indexOf(prop) >= 0) {
				target[this.parameterMappings[prop] ? this.parameterMappings[prop] : prop] =
					typeof source[prop] === 'function' ? source[prop]() : source[prop];
				
				// call function if needed
				if (typeof target[prop] === 'function') {
					target[prop] = target[prop]();
				}
				
				// transform Text nodes
				if (typeof target[prop] !== 'string' && target[prop] && target[prop].value) {
					target[prop] = target[prop].value();
				}
				
				// enums must be arrays
				else if (prop === 'enum' && typeof target[prop] === 'string') {
					try {
						target[prop] = JSON.parse(target[prop].replace(/'/g, '\"'));
					} catch (e) {
						// ignore
					}
				}
				
				if (!target.hasOwnProperty(prop) || (_.isArray(target[prop]) && _.isEmpty(target[prop]))) {
					delete target[prop];
				}
			}
		}
		
		return target;
	},
	
	isRaml08Version: function (version) {
		return version === 'RAML08';
	},

	unescapeYamlIncludes: function (yaml) {
		const start = yaml.indexOf("'!include ");
		if (start === -1) return yaml;
		const end = yaml.indexOf("'", start + 1);
		if (end === -1) return yaml;
		return yaml.substring(0, start) + yaml.substring(start + 1, end) + this.unescapeYamlIncludes(yaml.substring(end + 1));
	}

};
