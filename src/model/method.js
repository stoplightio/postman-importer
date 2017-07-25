// @flow
const Parameter = require('./parameter');
const Response = require('./response');
const Header = require('./header');
const Body = require('./body');
const Item = require('./item');
const SecurityRequirement = require('./securityRequirement');
const ExternalDocumentation = require('./externalDocumentation');
const Annotation = require('./annotation');

class Method {
	method: string; // get, put, post, delete, options, head, patch
	description: ?string;
	path: ?string;
	parameters: ?Parameter[]; // query parameters
	responses: ?Response[];
	name: ?string; // displayName / operationId
	headers: ?Header[];
	bodies: ?Body[];
	formBodies: ?Body[];
	is: ?Item[];
	produces: ?string[];
	consumes: ?string[];
	annotations: ?Annotation[];
	securedBy: ?SecurityRequirement[];
	tags: ?string[];
	summary: ?string;
	externalDocs: ?ExternalDocumentation;
	protocols: ?string[];
	queryStrings: ?Parameter[];
	deprecated: ?boolean;
}

module.exports = Method;