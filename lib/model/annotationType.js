// @flow
const Definition = require('./definition');

class AnnotationType {
	name: string;
	displayName: ?string;
	description: ?string;
	allowedTargets: string[];
	definition: ?Definition;
	required: boolean;
}

module.exports = AnnotationType;