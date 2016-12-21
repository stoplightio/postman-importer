const _ = require('lodash');

module.exports = {
	
	getInvalidCharacters: ['[', ']'],
	
	getReplacementCharacter: '_',
	
	getScalarTypes: ['string', 'number', 'integer', 'boolean', 'date', 'datetime', 'date-only', 'file', 'array', 'nilValue', 'time-only', 'datetime-only'],
	
	getValidFormat: ['byte', 'binary', 'password', 'date', 'date-time'],
	
	parameterMappings: {},
	
	getSupportedParameterFields: [
		'displayName', 'type', 'description', 'default', 'maximum',
		'minimum', 'maxLength', 'minLength', 'pattern', 'enum', 'format',
		'collectionFormat', 'allowEmptyValue', 'exclusiveMaximum', 'exclusiveMinimum',
		'maxItems', 'minItems', 'uniqueItems', 'required', 'facets'
	],
	
	setParameterFields: function (source, target) {
		for (let prop in source) {
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
						target[prop] = JSON.parse(target[prop].replace(/\'/g, '\"'));
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
	}
};
