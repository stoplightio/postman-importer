//@flow
const Info = require('./info');
const BaseUri = require('./baseUri');
const MediaType = require('./mediaType');
const SecurityDefinition = require('./securityDefinition');
const Resource = require('./resource');
const Definition = require('./definition');
const Tag = require('./tag');
const ExternalDocumentation = require('./externalDocumentation');
const Item = require('./item');
const Parameter = require('./parameter');
const ResourceType = require('./resourceType');
const AnnotationType = require('./annotationType');
const Annotation = require('./annotation');

class Root {
	info: ?Info;
	protocols: ?string[];
	baseUri: ?BaseUri;
	mediaType: ?MediaType;
	securityDefinitions: ?SecurityDefinition[];
	resources: ?Resource[];
	types: ?Definition[];
	tags: ?Tag[];
	externalDocs: ?ExternalDocumentation;
	documentation: ?Item[];
	baseUriParameters: ?Parameter[];
	resourceTypes: ?ResourceType[];
	annotationTypes: ?AnnotationType[];
	annotations: ?Annotation[];
	resourceAnnotations: ?Annotation[];
}

module.exports = Root;