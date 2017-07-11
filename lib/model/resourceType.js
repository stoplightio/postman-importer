// @flow
const Resource = require('./resource');

class ResourceType {
	name: string;
	usage: string;
	resource: Resource;
}

module.exports = ResourceType;