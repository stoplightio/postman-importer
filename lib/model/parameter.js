// @flow
const Definition = require('./definition');
const Annotation = require('./annotation');

class Parameter {
	_in: ?string;
	name: string;
	definition: Definition;
	displayName: string;
	description: string;
	required: ?boolean;
	hasParams: boolean;
	reference: string;
	annotations: Annotation[];
}

module.exports = Parameter;