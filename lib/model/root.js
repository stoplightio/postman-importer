//@flow

class Root {

	constructor() {
		let info; //Info object
		let protocols; // [String] equivalent to schemes
		let baseUri; //Base uri object (host && basePath)
		let mediaType; // MediaType object
		let securityDefinitions;
		let resources;
		let types;

		//raml10
		let documentation; // [Documentation]
		let baseUriParameters; //[Parameter]
		let resourceTypes;
	}
}

module.exports = Root;