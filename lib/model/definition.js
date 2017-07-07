// @flow
const Item = require('./item');
const Annotation = require('./annotation');

class Definition {
	name: string;
	type: ?string;
	internalType: ?string;
	compositionType: Definition[];
	reference: string;
	fileReference: ?string;
	properties: any;
	propsRequired: string[];
	required: boolean;
	format: ?string;
	description: ?string;
	_default: ?string;
	multipleOf: ?number;
	maximum: ?number;
	minimum: ?number;
	maxLength: ?number;
	minLength: ?number;
	pattern: ?string;
	maxItems: ?number;
	minItems: ?number;
	uniqueItems: ?boolean;
	maxProperties: ?number;
	minProperties: ?number;
	_enum: ?string;
	items: Definition;
	itemsList: Definition[];
	additionalProperties: boolean|Definition;
	discriminator: ?string;
	xml: ?string;
	example: any;
	annotations: Annotation[];
	
	jsonValue: ?string;
	fileTypes: string;
	discriminatorValue: any;
	facets: ?any[]; //swagger extension
	examples: any[];
	schema: Definition;
	schemaPath: string;
	displayName: ?string;
	collectionFormat: string;
	allowEmptyValue: boolean;
	
	allOf: ?any[];
	exclusiveMaximum: ?boolean;
	exclusiveMinimum: ?boolean;
	readOnly: ?boolean;
	externalDocs: string;
	title: string;
}

module.exports = Definition;