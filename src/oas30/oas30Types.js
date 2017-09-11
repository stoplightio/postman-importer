// @flow
// TODO: extensions { [string]: any }

/**
 * This is the root document object of the OpenAPI definition.
 */
class Model {
	openapi: string;
	info: Info;
	servers: ?Array<Server>;
	paths: Paths;
	components: Components;
	security: ?Array<SecurityRequirement>;
	tags: ?Array<Tag>;
	externalDocs: ?ExternalDocumentation;

	constructor(info: Info = new Info()) {
		this.openapi = '3.0.0';
		this.info = info;
		this.servers = [];
		this.paths = {};
		this.components = new Components();
	}
}

module.exports.Model = Model;

/**
 * The object provides metadata about the API. The metadata MAY be used by the clients if
 * needed, and MAY be presented in editing or documentation generation tools for
 * convenience.
 */
class Info {
	title: string;
	description: ?string;
	termsOfService: ?string;
	contact: ?Contact;
	license: ?License;
	version: string;

	constructor(title: string = '', version: string = '') {
		this.title = title;
		this.version = version;
	}
}

module.exports.Info = Info;

class Contact {
	name: ?string;
	url: ?string;
	email: ?string;
}

module.exports.Contact = Contact;

class License {
	name: string;
	url: ?string;

	constructor(name: string = '') {
		this.name = name;
	}
}

module.exports.License = License;

class Server {
	url: string;
	description: ?string;
	variables: ?{ [name: string]: ServerVariable };

	constructor(url: string) {
		this.url = url;
	}
}

module.exports.Server = Server;

class ServerVariable {
	enum: ?Array<string>;
	default: string;
	description: ?string;

	constructor(default_: string) {
		this.default = default_;
	}
}

module.exports.ServerVariable = ServerVariable;

class Components {
	schemas: { [string]: Schema | Reference };
	responses: { [string]: Response | Reference };
	parameters: { [string]: Parameter | Reference };
	examples: { [string]: Example | Reference };
	requestBodies: { [string]: RequestBody | Reference };
	headers: { [string]: Header | Reference };
	securitySchemes: { [string]: SecurityScheme | Reference };
	links: { [string]: Link | Reference };
	callbacks: { [string]: Callback | Reference };

	constructor() {
		this.schemas = {};
		this.responses = {};
		this.parameters = {};
		this.examples = {};
		this.requestBodies = {};
		this.headers = {};
		this.securitySchemes = {};
		this.links = {};
		this.callbacks = {};
	}
}

module.exports.Components = Components;

export type Paths = {
	[path: string]: PathItem,
}

class PathItem {
	$ref: ?string;
	summary: ?string;
	description: ?string;
	get: ?Operation;
	put: ?Operation;
	post: ?Operation;
	delete: ?Operation;
	options: ?Operation;
	head: ?Operation;
	patch: ?Operation;
	trace: ?Operation;
	servers: ?Array<Server>;
	parameters: ?Parameter | Reference;
}

module.exports.PathItem = PathItem;

class Operation {
	tags: ?Array<string>;
	summary: ?string;
	description: ?string;
	externalDocs: ?ExternalDocumentation;
	operationId: ?string;
	parameters: ?Array<Parameter | Reference>;
	requestBody: ?RequestBody | Reference;
	responses: Responses;
	callbacks: ?{ [name: string]: Callback | Reference };
	deprecated: ?boolean;
	security: ?Array<SecurityRequirement>;
	servers: ?Array<Server>;

	constructor(responses: Responses = { default: new Response('') }) {
		this.responses = responses;
	}
}

module.exports.Operation = Operation;

class ExternalDocumentation {
	description: ?string;
	url: string;

	constructor(url: string) {
		this.url = url;
	}
}

module.exports.ExternalDocumentation = ExternalDocumentation;

export type AllowedIn = 'query' | 'header' | 'path' | 'cookie'

/**
 * Describes a single operation parameter.
 *
 * A unique parameter is defined by a combination of a name and location.
 */
class Parameter {
	name: string;
	in: string;
	description: ?string;
	required: boolean;
	deprecated: ?boolean;
	allowEmptyValue: ?boolean;

	style: ?string;
	explode: ?boolean;
	allowReserverd: ?boolean;
	schema: ?Schema | Reference;
	example: ?any;
	examples: ?{ [string]: Example | Reference };

	content: ?{ [string]: MediaType };

	matrix: ?any;
	label: ?any;
	form: ?any;
	simple: ?Array<any>;
	spaceDelimited: ?Array<any>;
	pipeDelimited: ?Array<any>;
	deepObject: ?Object;

	constructor(name: string, in_: AllowedIn, required: boolean = false) {
		this.name = name;
		this.in = in_;
		this.required = required;
	}
}

module.exports.Parameter = Parameter;

class RequestBody {
	description: ?string;
	content: { [string]: MediaType };
	required: ?boolean;

	constructor(content: { [string]: MediaType }) {
		this.content = content;
	}
}

module.exports.RequestBody = RequestBody;

class MediaType {
	schema: ?Schema | Reference;
	example: ?any;
	examples: ?{ [string]: Example | Reference };
	encoding: ?{ [string]: Encoding };
}

module.exports.MediaType = MediaType;

class Encoding {
	contentType: ?string;
	headers: ?{ [string]: Header | Reference };
	style: ?string;
	explode: ?boolean;
	allowReserved: ?boolean;
}

module.exports.Encoding = Encoding;

export type Responses = {
	default: Response | Reference,
	[statusCode: string]: Response | Reference,
}

class Response {
	description: string;
	headers: ?{ [string]: Header | Reference };
	content: ?{ [string]: MediaType };
	links: ?{ [string]: Link | Reference };

	constructor(description: string) {
		this.description = description;
	}
}

module.exports.Response = Response;

export type Callback = {
	[expression: string]: PathItem,
}

class Example {
	summary: ?string;
	description: ?string;
	value: ?any;
	externalValue: ?string;
}

module.exports.Example = Example;

class Link {
	operationRef: ?string;
	operationId: ?string;
	parameters: ?{ [string]: any | string }; // expression
	requestBody: ?any | string; // expression
	description: ?string;
	server: ?Server;
}

module.exports.Link = Link;

// params without name and in
class Header {
	description: ?string;
	required: boolean;
	deprecated: ?boolean;
	allowEmptyValue: ?boolean;

	style: ?string;
	explode: ?boolean;
	allowReserverd: ?boolean;
	schema: ?Schema | Reference;
	example: ?any;
	examples: ?{ [string]: Example | Reference };

	content: ?{ [string]: MediaType };

	matrix: ?any;
	label: ?any;
	form: ?any;
	simple: ?Array<any>;
	spaceDelimited: ?Array<any>;
	pipeDelimited: ?Array<any>;
	deepObject: ?Object;

	constructor(required: boolean) {
		this.required = required;
	}
}

module.exports.Header = Header;

class Tag {
	name: string;
	description: ?string;
	externalDocs: ?ExternalDocumentation;

	constructor(name: string) {
		this.name = name;
	}
}

module.exports.Tag = Tag;

class Reference {
	$ref: string;

	constructor($ref: string) {
		this.$ref = $ref;
	}
}

module.exports.Reference = Reference;

export type SchemaArray = Array<Schema>;

export type PositiveInteger = number;

export type PositiveIntegerDefault0 = PositiveInteger;

export type SimpleTypes =
	'array'
	| 'boolean'
	| 'integer'
	| 'null'
	| 'number'
	| 'object'
	| 'string';

export type StringArray = Array<string>;

// JSON Schema
export type Schema = {
	title?: string;
	multipleOf?: number;
	maximum?: number;
	exclusiveMaximum?: boolean;
	minimum?: number;
	exclusiveMinimum?: boolean;
	maxLength?: PositiveInteger;
	minLength?: PositiveIntegerDefault0;
	pattern?: string;
	maxItems?: PositiveInteger;
	minItems?: PositiveIntegerDefault0;
	uniqueItems?: boolean;
	maxProperties?: PositiveInteger;
	minProperties?: PositiveIntegerDefault0;
	required?: StringArray;
	enum?: Array<any>;

	type?: SimpleTypes;
	allOf?: SchemaArray;
	anyOf?: SchemaArray;
	oneOf?: SchemaArray;
	not?: Schema;
	items?: Schema;
	properties?: { [key: any]: Schema };
	additionalProperties?: boolean | Schema;
	description?: string;
	format?: string;
	default?: any;

	nullable?: boolean;
	discriminator?: Discriminator;
	readOnly?: boolean;
	writeOnly?: boolean;
	xml?: XML;
	externalDocs?: ExternalDocumentation;
	example?: any;
	examples?: any;
	deprecated?: boolean;

	id?: string;
	$ref?: string;
	$schema?: string;
	additionalItems?: boolean | Schema;
	definitions?: { [key: any]: Schema };
	patternProperties?: { [key: any]: Schema };
	dependencies?: { [key: any]: Schema | StringArray };

	// only for conversion and flow needs it
	internalType?: string;
}

class Discriminator {
	propertyName: string;
	mapping: ?{ [string]: string };

	constructor(propertyName: string) {
		this.propertyName = propertyName;
	}
}

module.exports.Discriminator = Discriminator;

/**
 * A metadata object that allows for more fine-tuned XML model definitions.
 *
 * When using arrays; XML element names are not inferred (for singular/plural forms) and
 * the name property SHOULD be used to add that information. See examples for expected behavior.
 */
class XML {
	name: ?string;
	namespace: ?string;
	prefix: ?string;
	attribute: ?boolean;
	wrapped: ?boolean;
}

module.exports.XML = XML;

class SecurityScheme {
	type: string;
	description: ?string;
	name: ?string;
	in: ?string;
	scheme: ?string;
	bearerFormat: ?string;
	flows: ?OAuthFlows;
	openIdConnectUrl: ?string;

	constructor(type: string) {
		this.type = type;
	}
}

module.exports.SecurityScheme = SecurityScheme;

class OAuthFlows {
	implicit: ?OAuthFlow;
	password: ?OAuthFlow;
	clientCredentials: ?OAuthFlow;
	authorizationCode: ?OAuthFlow;
}

module.exports.OAuthFlows = OAuthFlows;

class OAuthFlow {
	authorizationUrl: ?string;
	tokenUrl: ?string;
	refreshUrl: ?string;
	scopes: { [string]: string };
}

module.exports.OAuthFlow = OAuthFlow;

export type SecurityRequirement = {
	[name: string]: Array<string>,
}
