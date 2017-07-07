// @flow
const Definition = require('./definition');

class Annotation {
	name: string;
	definition: Definition;
	annotations: Annotation[];
}

module.exports = Annotation;