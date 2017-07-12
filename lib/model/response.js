// @flow
const Annotation = require('./annotation');
const Header = require('./header');
const Body = require('./body');

class Response {
	httpStatusCode: string;
	name: string;
	description: string;
	headers: Header[];
	bodies: Body[];
	reference: string;
	hasParams: boolean;
	globalResponseDefinition: string;
	annotations: Annotation[];
}

module.exports = Response;