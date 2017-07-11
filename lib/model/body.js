// @flow
const Definition = require('./definition');
const Annotation = require('./annotation');

class Body {
	mimeType: ?string;
	description: ?string;
	definition: Definition;
	required: boolean;
	annotations: ?Annotation[];
}

module.exports = Body;