//@flow

class SecurityDefinition {

	constructor() {
		let schemaName;
		let type; //basic, apiKey, oauth2, OAuth 2.0, OAuth 1.0, Basic Authentication, Digest Authentication, Pass Through, x-other
		let description;
		let authorization; //[String] (implicit, password, application, accessCode, authorization_code, client_credentials)
		let authorizationUrl;
		let tokenUrl; // tokenUrl - tokenCredentialsUri  - accessTokenUri
		let scopes; // [key, value]

		//oas
		let name;
		let _in;

		//raml
		let requestTokenUri;
		let describedBy; //method object
		let displayName;
		let signatures; //[String]
	}
}

module.exports = SecurityDefinition;
