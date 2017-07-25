// @flow
const Definition = require('./definition');
const Annotation = require('./annotation');

class Body {
	mimeType: ?string;
	name: string;
	definition: ?Definition;
	description: ?string;
	required: ?boolean;
	hasParams: ?boolean;
	annotations: ?Annotation[];
}

module.exports = Body;