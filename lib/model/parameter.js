// @flow
const Definition = require('./definition');
const Annotation = require('./annotation');

class Parameter {
	_in: ?string;
	name: string;
	definition: ?Definition;
	required: ?boolean;
	annotations: ?Annotation[];
	displayName: ?string;
	hasParams: boolean;
	reference: string;
}

module.exports = Parameter;