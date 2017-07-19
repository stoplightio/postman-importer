module.exports = {
	parameterMappings: {},
	
	getSupportedParameterFields: [
		'type', 'description', 'default', 'maximum', 'exclusiveMaximum', 'minimum', 'exclusiveMinimum',
		'maxLength', 'minLength', 'pattern', 'maxItems', 'minItems', 'uniqueItems', 'enum', 'multipleOf',
		'items', 'format', 'collectionFormat', 'allowEmptyValue', 'required', 'x-raml-example'
	],

	getSupportedSchemaFields: [
		'$ref', 'format', 'title', 'description', 'default', 'multipleOf', 'maximum', 'exclusiveMaximum',
		'minimum', 'exclusiveMinimum', 'maxLength', 'minLength', 'pattern', 'maxItems', 'minItems',
		'uniqueItems', 'maxProperties', 'minProperties', 'required', 'enum', 'type', 'items', 'allOf',
		'properties', 'additionalProperties', 'example', 'discriminator', 'xml', 'schemaPath'
	],

	setParameterFields: function (source, target) {
		for (let prop in source) {
			if (!source.hasOwnProperty(prop)) continue;
			
			if (this.getSupportedParameterFields.indexOf(prop) >= 0) {
				if (this.parameterMappings[prop]) {
					target[this.parameterMappings[prop]] = source[prop];
				} else {
					target[prop] = source[prop];
				}
				
				// description must be a string
				if (prop === 'description') {
					target[prop] = String(target[prop]);
				}
				
				// enums must be arrays
				if (prop === 'enum' && typeof target[prop] === 'string') {
					try {
						target[prop] = JSON.parse(target[prop].replace(/'/g, '\"'));
					} catch (e) {
						// ignore
					}
				}
			}
		}
		return target;
	},

	isExtension: function(id) {
		return id.substring(0,2) === 'x-';
	}
};
