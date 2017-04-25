// @flow

class Method {

	constructor() {
		let method; // get, put, post, delete, options, head, patch
		let description;
		let path;
		let parameters;
		let responses;
		let name; // displayName / operationId
		let headers; // parameters
		let bodies;
		let formBodies; // bodies
		let is;
		let produces;
		let consumes;
		let annotations;
		let securedBy; // [SecurityRequirement]
	}
}

module.exports = Method;