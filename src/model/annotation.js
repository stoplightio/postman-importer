// @flow
const Definition = require('./definition');

class Annotation {
	name: string;
	definition: Definition|any;
	annotations: ?Annotation[];
}

module.exports = Annotation;