//@flow
const SecurityScope = require('./securityScope');
const Method = require('./method');

class SecurityDefinition {
	schemaName: string;
	type: string; // basic, apiKey, oauth2, oauth1, digest, x-other
	description: ?string;
	authorization: string[]; // implicit, password, application, accessCode
	authorizationUrl: string;
	tokenUrl: string; // tokenUrl - tokenCredentialsUri  - accessTokenUri
	scopes: SecurityScope[];
	describedBy: Method;
	requestTokenUri: string;
	displayName: ?string;
	signatures: string[];
	_in: ?string;
	name: ?string;
}

module.exports = SecurityDefinition;
