// @flow
const _ = require('lodash');
const Converter = require('../model/converter');
const Root = require('../model/root');
const Resource = require('../model/resource');
const ResourceType = require('../model/resourceType');
const Parameter = require('../model/parameter');
const Trait = require('../model/trait');
const Method = require('../model/method');
const Item = require('../model/item');
const Body = require('../model/body');
const Header = require('../model/header');
const Response = require('../model/response');
const parser = require('raml-1-parser');
const Raml10RootConverter = require('../raml10/raml10RootConverter');
const Raml10SecurityDefinitionConverter = require('../raml10/raml10SecurityDefinitionConverter');
const Raml10ResourceConverter = require('../raml10/raml10ResourceConverter');
const Raml10DefinitionConverter = require('../raml10/raml10DefinitionConverter');
const Raml10ResourceTypeConverter = require('../raml10/raml10ResourceTypeConverter');
const Raml10TraitConverter = require('../raml10/raml10TraitConverter');
const Raml10AnnotationTypeConverter = require('../raml10/raml10AnnotationTypeConverter');
const helper = require('../helpers/raml10');
const YAML = require('js-yaml');
const fs = require('fs');
const toJSONOptions = { serializeMetadata: false };
const RamlErrorParser = require('../helpers/ramlErrorParser');
const jsonHelper = require('../utils/json');

class Raml10Converter extends Converter {

	static detectFormat(data) {
		if (!data) return;
		data = _.trim(data);
		
		if (/#%RAML[\s]*1\.?0?/.test(data)) return 'RAML10';
		if (/#%RAML[\s]*0\.?8?/.test(data)) return 'RAML08';
	}
	
	_loadFile(filePath:string, options:any) {
		this.filePath = filePath;
		const fileContent = fs.readFileSync(filePath, 'utf8');
		this.format = Raml10Converter.detectFormat(fileContent);
		return new Promise((resolve, reject) => {
			parser.loadApi(filePath, Converter._options(options)).then((api) => {
				try {
					if (!_.isEmpty(api.errors())) this.errors = jsonHelper.parse(api.errors()).filter(log => log.isWarning === false);
					this.data = api.expand(true).toJSON(toJSONOptions);
					resolve();
				}
				catch (e) {
					reject(e);
				}
			}, (error) => {
				reject(error);
			});
		});
	}
	
	_loadData(data:string, options:any) {
		this.format = Raml10Converter.detectFormat(data);
		return new Promise((resolve, reject) => {
			const parsedData = parser.parseRAMLSync(data, options);
			if (parsedData.name === 'Error') {
				reject();
			} else {
				this.data = parsedData.expand(true).toJSON(toJSONOptions);
				resolve();
			}
		});
	}
	
	export(model:Root) {
		return new Promise((resolve, reject) => {
			try {
				Raml10Converter.fixInheritedProperties(model);
				
				const rootConverter = new Raml10RootConverter(model);
				const ramlDef = {};
				_.assign(ramlDef, rootConverter.export(model));
				const securityDefinitionConverter = new Raml10SecurityDefinitionConverter(model, rootConverter.annotationPrefix, ramlDef);
				if (model.securityDefinitions) ramlDef.securitySchemes = securityDefinitionConverter.export(model.securityDefinitions);
				const definitionConverter = new Raml10DefinitionConverter(model, rootConverter.annotationPrefix, ramlDef);
				if (model.types) ramlDef.types = definitionConverter.export(model.types);
				const resourceTypeConverter = new Raml10ResourceTypeConverter(model);
				if (model.resourceTypes) ramlDef.resourceTypes = resourceTypeConverter.export(model.resourceTypes);
				const traitConverter = new Raml10TraitConverter(model, rootConverter.annotationPrefix, ramlDef);
				if (model.traits) ramlDef.traits = traitConverter.export(model);
				if (ramlDef.traits && _.isEmpty(ramlDef.traits)) delete ramlDef.traits;
				const annotationTypeConverter = new Raml10AnnotationTypeConverter(model, rootConverter.annotationPrefix, ramlDef);
				if (model.annotationTypes) ramlDef.annotationTypes = annotationTypeConverter.export(model.annotationTypes);
				const resourceConverter = new Raml10ResourceConverter(model, rootConverter.annotationPrefix, ramlDef);
				if (model.resources) _.merge(ramlDef, resourceConverter.export(model.resources));

				resolve(Raml10Converter.getData(ramlDef));
			} catch (err) {
				reject(err);
			}
		});
	}

	import(ramlDef:any) {
		const rootConverter = new Raml10RootConverter(new Root());
		rootConverter.version = this.format;
		const model: Root = rootConverter.import(ramlDef);
		const securityDefinitionConverter = new Raml10SecurityDefinitionConverter();
		if (ramlDef.securitySchemes) model.securityDefinitions = securityDefinitionConverter.import(ramlDef.securitySchemes);
		const definitionConverter = new Raml10DefinitionConverter(model, null, ramlDef);
		definitionConverter.version = this.format;
		const types = ramlDef.types ? ramlDef.types : ramlDef.schemas;
		if (types) model.types = definitionConverter.import(types);
		const resourceTypeConverter = new Raml10ResourceTypeConverter();
		resourceTypeConverter.version = this.format;
		if (ramlDef.resourceTypes) model.resourceTypes = resourceTypeConverter.import(ramlDef.resourceTypes);
		const traitConverter = new Raml10TraitConverter();
		traitConverter.version = this.format;
		if (ramlDef.traits) model.traits = traitConverter.import(ramlDef.traits);
		const resourceConverter = new Raml10ResourceConverter(model, null, ramlDef);
		resourceConverter.version = this.format;
		if (ramlDef.resources) model.resources = resourceConverter.import(ramlDef.resources);
		const annotationTypeConverter = new Raml10AnnotationTypeConverter(model);
		if (ramlDef.annotationTypes) model.annotationTypes = annotationTypeConverter.import(ramlDef.annotationTypes);

    //add errors to model
		if (!_.isEmpty(this.errors)) {
			try {
				const ramlErrorParser = new RamlErrorParser();
				ramlErrorParser.addErrorNodes(this.filePath, model, this.errors);
			} catch (e) {
				//ignore
				console.log(e);
			}
		}

		return model;
	}
	
	static fixInheritedProperties(model:Root) {
		const map = [];
		const resourceTypes: ?ResourceType[] = model.resourceTypes;
		const traits: ?Trait[] = model.traits;
		if (model.hasOwnProperty('resources') && model.resources) {
			const resources: Resource[] = model.resources;
			for (let i = 0; i < resources.length; i++) {
				const resource: Resource = resources[i];
				if (resource.hasOwnProperty('resourceType') && resource.resourceType && resourceTypes) {
					const resourceType: Item[] = resource.resourceType;
					for (let j = 0; j < resourceType.length; j++) {
						const type = resourceType[j];
						const usedTypeName: string = type.name;
						const usedResourceType: ResourceType = resourceTypes.filter(function (resourceType) { return usedTypeName === resourceType.name; })[0];
						const usedResource: ?Resource = usedResourceType.resource;
						if (usedResource && usedResource.hasOwnProperty('parameters') && usedResource.parameters) {
							const parameters: Parameter[] = usedResource.parameters;
							for (let k = 0; i < parameters.length; i++) {
								const parameter: Parameter = parameters[k];
								const item = {
									type: 'uriParameter',
									name: parameter.name,
									resource: resource.path,
									params: null
								};
								map.push(item);
							}
						}
						if (usedResource && usedResource.hasOwnProperty('methods') && usedResource.methods) {
							const methods: Method[] = usedResource.methods;
							for (let k = 0; k < methods.length; k++) {
								const method: Method = methods[k];
								Raml10Converter.mapMethodProperties(map, method, null, resource.path, method.method, type.value);
							}
						}
					}
				}
				if (resource.hasOwnProperty('is') && resource.is && traits) {
					const isList: Item[] = resource.is;
					for (let j = 0; j < isList.length; j++) {
						const is = isList[j];
						const usedTraitName: string = is.name;
						const usedTrait: Trait = traits.filter(function (trait) { return usedTraitName === trait.name; })[0];
						if (usedTrait && usedTrait.method) Raml10Converter.mapMethodProperties(map, usedTrait.method, usedTrait.name, resource.path, 'all', is.value);
					}
				}
				if (resource.hasOwnProperty('methods') && resource.methods) {
					const methods: Method[] = resource.methods;
					for (let j = 0; j < methods.length; j++) {
						const method: Method = methods[j];
						if (method.hasOwnProperty('is') && method.is && traits) {
							const isList: Item[] = method.is;
							for (let k = 0; k < isList.length; k++) {
								const is = isList[k];
								const usedTraitName: string = is.name;
								const usedTrait: Trait = traits.filter(function (trait) { return usedTraitName === trait.name; })[0];
								if (usedTrait && usedTrait.method) Raml10Converter.mapMethodProperties(map, usedTrait.method, usedTrait.name, resource.path, method.method, is.value);
							}
						}
					}
				}
			}
			for (let i = 0; i < map.length; i++) {
				const item: any = map[i];
				const userResource: Resource = resources.filter(function (resource) { return resource.path === item.resource; })[0];
				if (userResource.hasOwnProperty('methods') && userResource.methods) {
					const userMethod: Method = userResource.methods.filter(function (method) {
						return item.method === 'all' || method.method === item.method;
					})[0];
					if (item.type === 'body' && userMethod.bodies) {
						const bodyMimeTypes = [];
						for (let j = 0; j < userMethod.bodies.length; j++) {
							bodyMimeTypes.push(userMethod.bodies[j].mimeType);
						}
						if (item.name && bodyMimeTypes.includes(item.name) && userMethod.hasOwnProperty('bodies')) {
							const bodies = userMethod.bodies;
							bodies.splice(bodyMimeTypes.indexOf(item.name), 1);
						}
					} else if (item.type === 'header' && userMethod.headers) {
						const headerNames = userMethod.headers.map(function (header) {
							return header.name;
						});
						if (headerNames.includes(item.name) && userMethod.headers) userMethod.headers.splice(headerNames.indexOf(item.name), 1);
					} else if (item.type === 'queryParameter' && userMethod.parameters) {
						const parameterNames = userMethod.parameters.map(function (parameter) {
							return parameter.name;
						});
						if (parameterNames.includes(item.name) && userMethod.parameters) userMethod.parameters.splice(parameterNames.indexOf(item.name), 1);
					} else if (item.type === 'uriParameter' && userResource.parameters) {
						const parameterNames = userResource.parameters.map(function (parameter) {
							return parameter.name;
						});
						if (parameterNames.includes(item.name) && userResource.parameters) userResource.parameters.splice(parameterNames.indexOf(item.name), 1);
					} else if (item.type === 'response' && userMethod.responses) {
						const responseCodes = userMethod.responses.map(function (response) {
							return response.httpStatusCode;
						});
						if (responseCodes.includes(item.name) && userMethod.responses) userMethod.responses.splice(responseCodes.indexOf(item.name), 1);
					}
				}
			}
		}
	}

	static getData(ramlDef) {
		return '#%RAML 1.0\n' + helper.unescapeYamlIncludes(YAML.dump(JSON.parse(JSON.stringify(ramlDef)), {lineWidth: -1}));
	}
	
	static mapMethodProperties(map, method: Method, traitName, resourcePath, methodName, params) {
		if (method.hasOwnProperty('bodies') && method.bodies !== null) {
			const bodies: Body[] = method.bodies;
			
			for (let l = 0; l < bodies.length; l++) {
				const body: Body = bodies[l];
				const item = {
					type: 'body',
					trait: traitName,
					name: body.mimeType,
					resource: resourcePath,
					method: methodName,
					params: params
				};
				map.push(item);
			}
		}
		if (method.hasOwnProperty('headers') && method.headers !== null) {
			const headers: Header[] = method.headers;
			for (let l = 0; l < headers.length; l++) {
				const header: Header = headers[l];
				const item = {
					type: 'header',
					trait: traitName,
					name: header.name,
					resource: resourcePath,
					method: methodName,
					params: params
				};
				map.push(item);
			}
		}
		if (method.hasOwnProperty('parameters') && method.parameters !== null) {
			const parameters: Parameter[] = method.parameters;
			for (let l = 0; l < parameters.length; l++) {
				const parameter: Parameter = parameters[l];
				const item = {
					type: 'queryParameter',
					trait: traitName,
					name: parameter.name,
					resource: resourcePath,
					method: methodName,
					params: params
				};
				map.push(item);
			}
		}
		if (method.hasOwnProperty('responses') && method.responses !== null) {
			const responses: Response[] = method.responses;
			for (let l = 0; l < responses.length; l++) {
				const response: Response = responses[l];
				if (response.bodies) {
					const mimeTypes = response.bodies.map(body => body.mimeType);
					const item: any = {
						type: 'response',
						name: response.httpStatusCode,
						resource: resourcePath,
						method: methodName,
						mimeTypes: mimeTypes,
						params: params
					};
					if (traitName) item.trait = traitName;
					map.push(item);
				}
			}
		}
	}
}

module.exports = Raml10Converter;
