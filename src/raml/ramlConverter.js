// @flow
const _ = require('lodash');
const Converter = require('../converters/converter');
const ConverterModel = require('oas-raml-converter-model');
const Root = ConverterModel.Root;
const Resource = ConverterModel.Resource;
const ResourceType = ConverterModel.ResourceType;
const Parameter = ConverterModel.Parameter;
const Trait = ConverterModel.Trait;
const Method = ConverterModel.Method;
const Item = ConverterModel.Item;
const Body = ConverterModel.Body;
const Header = ConverterModel.Header;
const Response = ConverterModel.Response;
const parser = require('raml-1-parser');
const RamlRootConverter = require('../raml/ramlRootConverter');
const RamlSecurityDefinitionConverter = require('../raml/ramlSecurityDefinitionConverter');
const RamlResourceConverter = require('../raml/ramlResourceConverter');
const RamlDefinitionConverter = require('../raml/ramlDefinitionConverter');
const RamlResourceTypeConverter = require('../raml/ramlResourceTypeConverter');
const RamlTraitConverter = require('../raml/ramlTraitConverter');
const RamlAnnotationTypeConverter = require('../raml/ramlAnnotationTypeConverter');
const helper = require('../helpers/raml');
const YAML = require('js-yaml');
const fs = require('fs');
const toJSONOptions = { serializeMetadata: false, sourceMap: true };
const RamlErrorModel = require('../helpers/ramlErrorModel');
const jsonHelper = require('../utils/json');
const path = require('path');

class RamlConverter extends Converter {

	static detectFormat(data) {
		if (!data) return;
		data = _.trim(data);
		
		if (/#%RAML[\s]*1\.?0?/.test(data)) return 'RAML10';
		if (/#%RAML[\s]*0\.?8?/.test(data)) return 'RAML08';
	}
	
	_loadFile(filePath:string, options:any) {
		this.filePath = filePath;
		const fileContent = fs.readFileSync(filePath, 'utf8');
		
		this.format = RamlConverter.detectFormat(fileContent);
		return new Promise((resolve, reject) => {
			parser.loadApi(filePath, Converter._options(options)).then((api) => {
				try {
					const errors = api.errors();
					if (!_.isEmpty(errors)) this.errors = jsonHelper.parse(errors);
					this.data = api.expand(true).toJSON(toJSONOptions);
					this._removeSourceMapLocalRef(this.data, path.basename(filePath));
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
		this.fileContent = data;
		this.format = RamlConverter.detectFormat(data);
		if (options && (!options.hasOwnProperty('attributeDefaults') || options.attributeDefaults)) options.attributeDefaults = false;
		return new Promise((resolve, reject) => {
			const parsedData = parser.parseRAMLSync(data, options);
			if (parsedData.name === 'Error') {
				reject();
			} else {
				const errors = parsedData.errors();
				if (!_.isEmpty(errors)) this.errors = jsonHelper.parse(errors);
				this.data = parsedData.expand(true).toJSON(toJSONOptions);
				this._removeSourceMapLocalRef(this.data, '#local.raml');
				resolve();
			}
		});
	}
	
	_removeSourceMapLocalRef(ramlDef:any, filePath: string) {
		if (!_.isEmpty(ramlDef) && typeof ramlDef === 'object' && ramlDef.hasOwnProperty('sourceMap') && ramlDef['sourceMap'].hasOwnProperty('path')) {
			if (ramlDef['sourceMap']['path'] === '#local.raml' || ramlDef['sourceMap']['path'] === filePath) {
				delete ramlDef['sourceMap'];
			} else {
				if (ramlDef.hasOwnProperty('properties')) {
					this._removeSourceMapRecursive(ramlDef['properties'], ramlDef['sourceMap']['path']);
				}
				if (ramlDef.hasOwnProperty('queryParameters')) {
					this._removeSourceMapRecursive(ramlDef['queryParameters'], ramlDef['sourceMap']['path']);
				}
				if (ramlDef.hasOwnProperty('headers')) {
					this._removeSourceMapRecursive(ramlDef['headers'], ramlDef['sourceMap']['path']);
				}
				if (ramlDef.hasOwnProperty('responses')) {
					this._removeSourceMapRecursive(ramlDef['responses'], ramlDef['sourceMap']['path']);
				}
			}
		}
		
		for (const id in ramlDef) {
			if (!ramlDef.hasOwnProperty(id)) continue;
			const value = ramlDef[id];
			
			if (typeof value === 'object') {
				this._removeSourceMapLocalRef(value, filePath);
			}
		}
	}
	
	_removeSourceMapRecursive(ramlDef: any, pathId: string) {
		for (const id in ramlDef) {
			if (!ramlDef.hasOwnProperty(id)) continue;
			const value = ramlDef[id];

			if (id === 'sourceMap' && typeof value === 'object' && value.hasOwnProperty('path') && value['path'] === pathId) {
				delete ramlDef[id];
				continue;
			}

			if (typeof value === 'object') {
				this._removeSourceMapRecursive(value, pathId);
			}
		}
	}
	
	export(model:Root) {
		return new Promise((resolve, reject) => {
			try {
				RamlConverter.fixInheritedProperties(model);
				
				const rootConverter = new RamlRootConverter(model);
				const ramlDef = {};
				_.assign(ramlDef, rootConverter.export(model));
				const securityDefinitionConverter = new RamlSecurityDefinitionConverter(model, rootConverter.annotationPrefix, ramlDef);
				if (model.securityDefinitions) ramlDef.securitySchemes = securityDefinitionConverter.export(model.securityDefinitions);
				const definitionConverter = new RamlDefinitionConverter(model, rootConverter.annotationPrefix, ramlDef);
				if (model.types) ramlDef.types = definitionConverter.export(model.types);
				const resourceTypeConverter = new RamlResourceTypeConverter(model);
				if (model.resourceTypes) ramlDef.resourceTypes = resourceTypeConverter.export(model.resourceTypes);
				const traitConverter = new RamlTraitConverter(model, rootConverter.annotationPrefix, ramlDef);
				if (model.traits) ramlDef.traits = traitConverter.export(model);
				if (ramlDef.traits && _.isEmpty(ramlDef.traits)) delete ramlDef.traits;
				const annotationTypeConverter = new RamlAnnotationTypeConverter(model, rootConverter.annotationPrefix, ramlDef);
				if (model.annotationTypes) ramlDef.annotationTypes = annotationTypeConverter.export(model.annotationTypes);
				const resourceConverter = new RamlResourceConverter(model, rootConverter.annotationPrefix, ramlDef);
				if (model.resources) _.merge(ramlDef, resourceConverter.export(model.resources));

				resolve(RamlConverter.getData(ramlDef));
			} catch (err) {
				reject(err);
			}
		});
	}

	import(ramlDef:any, addErrorsToModel:boolean) {
		const rootConverter = new RamlRootConverter(new Root());
		rootConverter.version = this.format;
		const model: Root = rootConverter.import(ramlDef);
		const securityDefinitionConverter = new RamlSecurityDefinitionConverter();
		if (ramlDef.securitySchemes) model.securityDefinitions = securityDefinitionConverter.import(ramlDef.securitySchemes);
		const definitionConverter = new RamlDefinitionConverter(model, null, ramlDef);
		definitionConverter.version = this.format;
		const types = ramlDef.types ? ramlDef.types : ramlDef.schemas;
		if (types) model.types = definitionConverter.import(types);
		const resourceTypeConverter = new RamlResourceTypeConverter();
		resourceTypeConverter.version = this.format;
		if (ramlDef.resourceTypes) model.resourceTypes = resourceTypeConverter.import(ramlDef.resourceTypes);
		const traitConverter = new RamlTraitConverter();
		traitConverter.version = this.format;
		if (ramlDef.traits) model.traits = traitConverter.import(ramlDef.traits);
		const resourceConverter = new RamlResourceConverter(model, null, ramlDef);
		resourceConverter.version = this.format;
		if (ramlDef.resources) model.resources = resourceConverter.import(ramlDef.resources);
		const annotationTypeConverter = new RamlAnnotationTypeConverter(model);
		if (ramlDef.annotationTypes) model.annotationTypes = annotationTypeConverter.import(ramlDef.annotationTypes);

    //add errors to model
		if (addErrorsToModel && !_.isEmpty(this.errors)) {
			try {
				const ramlErrorModel = new RamlErrorModel();
				if (this.filePath) ramlErrorModel.addErrorNodesFromPath(this.filePath, model, this.errors);
				else ramlErrorModel.addErrorNodesFromContent(this.fileContent, model, this.errors);
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
								RamlConverter.mapMethodProperties(map, method, null, resource.path, method.method, type.value);
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
						if (usedTrait && usedTrait.method) RamlConverter.mapMethodProperties(map, usedTrait.method, usedTrait.name, resource.path, 'all', is.value);
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
								if (usedTrait && usedTrait.method) RamlConverter.mapMethodProperties(map, usedTrait.method, usedTrait.name, resource.path, method.method, is.value);
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
		if (method.hasOwnProperty('bodies') && method.bodies != null) {
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
		if (method.hasOwnProperty('headers') && method.headers != null) {
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
		if (method.hasOwnProperty('parameters') && method.parameters != null) {
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
		if (method.hasOwnProperty('responses') && method.responses != null) {
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

module.exports = RamlConverter;
