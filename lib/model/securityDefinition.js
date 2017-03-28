//@flow

class SecurityDefinition {

	constructor() {
		let schemaName;
		let type; //basic, apiKey, oauth2, oauth1, digest, x-other
		let description;
		let authorization; //[String] (implicit, password, application, accessCode)
		let authorizationUrl;
		let tokenUrl; // tokenUrl - tokenCredentialsUri  - accessTokenUri
		let scopes; // [key, value]

		//oas
		let name;
		let _in; // (header | query)

		//raml
		let requestTokenUri;
		let describedBy; //method object
		let displayName;
		let signatures; //[String]
	}
}

module.exports = SecurityDefinition;
