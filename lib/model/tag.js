// @flow
const ExternalDocumentation = require('./externalDocumentation');

class Tag {
	name: string;
	description: ?string;
	externalDocs: ExternalDocumentation;
}

module.exports = Tag;