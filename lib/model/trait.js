// @flow
const Method = require('./method');

class Trait {
	name: string;
	usage: ?string;
	method: Method;
}

module.exports = Trait;