// @flow

class Definition {

	constructor() {
		let name;
		let type; //primitive type
		let reference; //reference to another definition
		let fileReference; //reference to another file
		let compositionType;
		let properties;
		let required;
		let format;
		let description;
		let _default;
		let multipleOf;
		let maximum;
		let minimum;
		let maxLength;
		let minLength;
		let pattern;
		let maxItems;
		let minItems;
		let uniqueItems;
		let maxProperties;
		let minProperties;
		let _enum;
		let items;
		let additionalProperties;
		let discriminator;
		let xml;
		let example;


		//only raml
		let fileTypes;
		let discriminatorValue;
		let facets; //swagger extension
		let examples;
		let annotations; //swagger extension
		let schema;
		let schemaPath;
		let propsRequired;
		let displayName;

		//only oas
		let allOf;
		let exclusiveMaximum; //
		let exclusiveMinimum; //
		let readOnly;
		let externalDocs;
		let title; //
	}
}

module.exports = Definition;