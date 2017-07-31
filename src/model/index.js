const Annotation = require('./annotation');
const AnnotationType = require('./annotationType');
const BaseUri = require('./baseUri');
const Body = require('./body');
const Definition = require('./definition');
const ExternalDocumentation = require('./externalDocumentation');
const Header = require('./header');
const Info = require('./info');
const InfoData = require('./infoData');
const Item = require('./item');
const MediaType = require('./mediaType');
const Method = require('./method');
const Parameter = require('./parameter');
const Resource = require('./resource');
const ResourceType = require('./resourceType');
const Response = require('./response');
const Root = require('./root');
const SecurityDefinition = require('./securityDefinition');
const SecurityRequirement = require('./securityRequirement');
const SecurityScope = require('./securityScope');
const Tag = require('./tag');
const Trait = require('./trait');

module.exports = {
	Annotation: Annotation,
	AnnotationType: AnnotationType,
	BaseUri: BaseUri,
	Body: Body,
	Definition: Definition,
	ExternalDocumentation: ExternalDocumentation,
	Header: Header,
	Info: Info,
	InfoData: InfoData,
	Item: Item,
	MediaType: MediaType,
	Method: Method,
	Parameter: Parameter,
	Resource: Resource,
	ResourceType: ResourceType,
	Response: Response,
	Root: Root,
	SecurityDefinition: SecurityDefinition,
	SecurityRequirement: SecurityRequirement,
	SecurityScope: SecurityScope,
	Tag: Tag,
	Trait: Trait
};
