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
		let describedBy; //method object - oas in/name

		//raml
		let requestTokenUri;
		let displayName;
		let signatures; //[String]
	}
}

module.exports = SecurityDefinition;
