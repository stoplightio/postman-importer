// @flow
const Definition = require('./definition');
const Annotation = require('./annotation');

class Header {
	_in: ?string;
	name: string;
	definition: Definition;
	required: ?boolean;
	annotations: ?Annotation[];
	hasParams: ?boolean;
	
	displayName: ?string;
}

module.exports = Header;