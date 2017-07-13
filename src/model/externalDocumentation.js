// @flow
const Annotation = require('./annotation');

class ExternalDocumentation {
	url: string;
	description: ?string;
	annotations: Annotation[];
}

module.exports = ExternalDocumentation;