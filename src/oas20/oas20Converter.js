// @flow
const _ = require('lodash');
const ConverterModel = require('oas-raml-converter-model');
const Parameter = ConverterModel.Parameter;
const Method = ConverterModel.Method;
const Root = ConverterModel.Root;
const Response = ConverterModel.Response;
const Body = ConverterModel.Body;
const ResourceType = ConverterModel.ResourceType;
const Trait = ConverterModel.Trait;
const Item = ConverterModel.Item;
const Header = ConverterModel.Header;
const Resource = ConverterModel.Resource;
const Converter = require('../converters/converter');
const parser = require('swagger-parser');
const Oas20RootConverter = require('../oas20/oas20RootConverter');
const Oas20SecurityDefinitionConverter = require('../oas20/oas20SecurityDefinitionConverter');
const Oas20ResourceConverter = require('../oas20/oas20ResourceConverter');
const Oas20DefinitionConverter = require('../oas20/oas20DefinitionConverter');
const Oas20TraitConverter = require('../oas20/oas20TraitConverter');
const YAML = require('js-yaml');
const jsonHelper = require('../utils/json');

class Oas20Converter extends Converter {
	
	_loadFile(filePath:any, options:any) {
		return new Promise((resolve, reject) => {
			const validateOptions = _.cloneDeep(options || {});
			const validate = options && (options.validate === true || options.validateImport === true);
			validateOptions.validate = { schema: validate, spec: validate};
			
			const dataCopy = _.cloneDeep(filePath);
			parser.validate(dataCopy, validateOptions)
				.then(() => {
					this._doParseData(filePath, options || {}, resolve, reject);
				})
				.catch(reject);
		});
	}
	
	_loadData(data:string, options:any) {
		return new Promise((resolve, reject) => {
			const dataObject = YAML.safeLoad(data);
			parser.parse(dataObject, options).then((api) =>{
				this._doParseData(api, options || {}, resolve, reject);
			}).catch(reject);
		});
	}
	
	_doParseData(dataOrPath:any, options:any, resolve:any, reject:any) {
		// without validation
		parser.parse(dataOrPath, options)
			.then((api) => {
				JSON.parse(JSON.stringify(api));
				
				this.data = api;
				let parseFn;
				if (typeof dataOrPath === 'string') {
					parseFn = parser.dereference(dataOrPath, JSON.parse(JSON.stringify(api)), options);
				} else {
					parseFn = parser.dereference(JSON.parse(JSON.stringify(api)), options);
				}
				
				parseFn
					.then((dereferencedAPI) => {
						if (options && options.expand) {
							this.data = dereferencedAPI;
						} else {
							this.data.dereferencedAPI = dereferencedAPI;
						}
						resolve();
					})
					.catch(reject);
			})
			.catch(reject);
	}
	
	export(model:Root, format: string) {
		return new Promise((resolve, reject) => {
			try {
				Oas20Converter.fixInheritedProperties(model);
				
				const rootConverter = new Oas20RootConverter();
				const oasDef = { swagger: '2.0' };
				_.assign(oasDef, rootConverter.export(model));
				if (model.hasOwnProperty('securityDefinitions') && model.securityDefinitions) {
					const securityDefinitionConverter = new Oas20SecurityDefinitionConverter();
					const securityDef = securityDefinitionConverter.export(model.securityDefinitions);
					if (!_.isEmpty(securityDef)) oasDef.securityDefinitions = securityDef;
				}
				const definitionConverter = new Oas20DefinitionConverter();
				if (model.hasOwnProperty('types')) oasDef.definitions = definitionConverter.export(model.types);
				const traitConverter = new Oas20TraitConverter();
				if (model.hasOwnProperty('traits') && model.traits){
					const traitsDef: any = traitConverter.export(model.traits);
					if (!_.isEmpty(traitsDef.parameters)) oasDef.parameters = traitsDef.parameters;
					if (!_.isEmpty(traitsDef.responses)) oasDef.responses = traitsDef.responses;
				}
				const resourceConverter = new Oas20ResourceConverter(model, null, oasDef);
				if (model.hasOwnProperty('resources') && model.resources) {
					oasDef.paths = resourceConverter.export(model.resources);
				} else {
					oasDef.paths = {};
				}

				resolve(Oas20Converter._getData(oasDef, format));
			} catch (err) {
				reject(err);
			}
		});
	}

	import(oasDef:any) {
		const rootConverter = new Oas20RootConverter();
		const model: Root = rootConverter.import(oasDef);
		const securityDefinitionConverter = new Oas20SecurityDefinitionConverter(model, oasDef.dereferencedAPI.securityDefinitions);
		if (oasDef.hasOwnProperty('securityDefinitions') && !_.isEmpty(oasDef.securityDefinitions)) model.securityDefinitions = securityDefinitionConverter.import(oasDef.securityDefinitions);
		const definitionConverter = new Oas20DefinitionConverter(model, '', oasDef);
		if (oasDef.hasOwnProperty('definitions')) model.types = definitionConverter.import(oasDef.definitions);
		const traitConverter = new Oas20TraitConverter(model, oasDef.dereferencedAPI.parameters);
		if (oasDef.hasOwnProperty('parameters') || oasDef.hasOwnProperty('responses')) {
			model.traits = traitConverter.import({
				parameters: oasDef.parameters,
				responses: oasDef.responses
			});
		}
		const resourceConverter = new Oas20ResourceConverter(model, oasDef.dereferencedAPI.paths, oasDef);
		const paths = {};
		Object.keys(oasDef.paths).sort().forEach(path => paths[path] = oasDef.paths[path]);
		if (oasDef.hasOwnProperty('paths')) model.resources = resourceConverter.import(paths);

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
				if (resource.hasOwnProperty('resourceType')) {
					const resourceType: ?Item[] = resource.resourceType;
					if (resourceType != null && resourceTypes) {
						for (let j = 0; j < resourceType.length; j++) {
							const type = resourceType[j];
							const usedTypeName: string = type.name;
							const usedResourceType: ResourceType = resourceTypes.filter(function (rt) { return usedTypeName === rt.name; })[0];
							if (!usedResourceType) continue;
							
							const usedResource: ?Resource = usedResourceType.resource;
							if (usedResource && usedResource.hasOwnProperty('parameters') && usedResource.parameters) {
								const parameters: Parameter[] = usedResource.parameters;
								for (let k = 0; k < parameters.length; k++) {
									const parameter = parameters[k];
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
									const method = methods[k];
									Oas20Converter.mapMethodProperties(map, method, null, resource.path, method.method, type.value);
								}
							}
						}
					}
				}
				if (resource.hasOwnProperty('is') && resource.is && traits) {
					const isList: Item[] = resource.is;
					for (let j = 0; j < isList.length; j++) {
						const is: Item = isList[j];
						const usedTraitName: string = is.name;
						const usedTrait: Trait = traits.filter(function (trait) { return usedTraitName === trait.name; })[0];
						if (usedTrait && usedTrait.method) Oas20Converter.mapMethodProperties(map, usedTrait.method, usedTrait.name, resource.path, 'all', is.value);
					}
				}
				if (resource.hasOwnProperty('methods') && resource.methods) {
					const methods: Method[] = resource.methods;
					for (let j = 0; j < methods.length; j++) {
						const method: Method = methods[j];
						if (method.hasOwnProperty('is') && method.is && traits) {
							const isList: Item[] = method.is;
							for (let k = 0; k < isList.length; k++) {
								const is: Item = isList[k];
								const usedTraitName: string = is.name;
								const usedTrait: Trait = traits.filter(function (trait) { return usedTraitName === trait.name; })[0];
								if (usedTrait && usedTrait.method) Oas20Converter.mapMethodProperties(map, usedTrait.method, usedTrait.name, resource.path, method.method, is.value);
							}
						}
					}
				}
			}
			for (let i = 0; i < map.length; i++) {
				const item = map[i];
				const userResource: Resource = resources.filter(function (resource) { return resource.path === item.resource; })[0];
				if (!userResource.hasOwnProperty('methods')) continue;
				if (userResource.methods) {
					const userMethods: Method[] = userResource.methods.filter(function (method) { return item.method === 'all' || method.method === item.method; });
					for (let m = 0; m < userMethods.length; m++) {
						const userMethod: Method = userMethods[m];
						if (item.type === 'header' && userMethod && userMethod.headers != null && item.trait) {
							const headers: Header[] = userMethod.headers;
							const headerNames = headers.map(function (header) { return header.name; });
							if (headerNames.includes(item.name)) {
								headers.splice(headerNames.indexOf(item.name), 1);
								const header = new Header();
								const trait: string = item.trait ? item.trait : '';
								header.reference = '#/parameters/trait:' + trait + ':' + item.name;
								headers.push(header);
							}
						} else if (item.type === 'queryParameter' && userMethod && userMethod.parameters && item.trait) {
							const parameters: Parameter[] = userMethod.parameters;
							const parameterNames = parameters.map(function (parameter) { return parameter.name; });
							if (parameterNames.includes(item.name)) {
								parameters.splice(parameterNames.indexOf(item.name), 1);
								const parameter = new Parameter();
								const trait: string = item.trait ? item.trait : '';
								parameter.reference = '#/parameters/trait:' + trait + ':' + item.name;
								parameters.push(parameter);
							}
						} else if (item.type === 'response' && userMethod && userMethod.responses && item.trait) {
							const responses: Response[] = userMethod.responses;
							const responseCodes = responses.map(function (response) { return response.httpStatusCode; });
							if (responseCodes.includes(item.name)) {
								responses.splice(responseCodes.indexOf(item.name), 1);
								const response = new Response();
								response.httpStatusCode = item.name;
								response.reference = '#/responses/trait:' + item.trait + ':' + item.name;
								responses.push(response);
								const produces = userMethod.produces ? userMethod.produces : [];
								for (const m in item.mimeTypes) {
									if (!produces.includes(item.mimeTypes[m])) produces.push(item.mimeTypes[m]);
									userMethod.produces = produces;
								}
							}
						}
					}
				}
			}
		}
	}
	
	static mapMethodProperties(map, method:Method, traitName, resourcePath, methodName, params) {
		if (method.hasOwnProperty('bodies') && method.bodies != null) {
			const bodies: Body[] = method.bodies;
			for (let i = 0; i < bodies.length; i++) {
				const body: Body = bodies[i];
				if (!body.hasParams) {
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
		}
		if (method.hasOwnProperty('headers') && method.headers != null) {
			const headers: Header[] = method.headers;
			for (let i = 0; i < headers.length; i++) {
				const header: Header = headers[i];
				if (!header.hasParams) {
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
		}
		if (method.hasOwnProperty('parameters') && method.parameters != null) {
			const parameters: Parameter[] = method.parameters;
			for (let i = 0; i < parameters.length; i++) {
				const parameter: Parameter = parameters[i];
				if (!parameter.hasParams) {
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
		}
		if (method.hasOwnProperty('responses') && method.responses != null) {
			const responses: Response[] = method.responses;
			for (let i = 0; i < responses.length; i++) {
				const response = responses[i];
				const mimeTypes = response.bodies? response.bodies.map(body => body.mimeType) : [];
				if (!response.hasParams) {
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

	static _getData(oasDef, format) {
		if (format === 'yaml')
			return YAML.dump(jsonHelper.parse(oasDef));

		if (format === 'json')
			return jsonHelper.stringify(oasDef, 2);
	}
}

module.exports = Oas20Converter;
