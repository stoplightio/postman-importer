// @flow
const Item = require('./item');
const Parameter = require('./parameter');
const Method = require('./method');
const SecurityRequirement = require('./securityRequirement');
const Annotation = require('./annotation');

class Resource {
	path: string;
	relativePath: string;
	description: ?string;
	displayName: ?string;
	is: Item[];
	parameters: Parameter[];
	baseUriParameters: Parameter[];
	resourceType: Item[];
	methods: Method[];
	securedBy: SecurityRequirement[];
	annotations: Annotation[];
	resources: Resource[];
}

module.exports = Resource;