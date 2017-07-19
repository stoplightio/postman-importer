// @flow
const _ = require('lodash');
const Parameter = require('../model/parameter');
const Method = require('../model/method');
const Root = require('../model/root');
const Response = require('../model/response');
const Body = require('../model/body');
const ResourceType = require('../model/resourceType');
const Trait = require('../model/trait');
const Item = require('../model/item');
const Header = require('../model/header');
const Resource = require('../model/resource');
const Converter = require('../model/converter');
const parser = require('swagger-parser');
const Oas20RootConverter = require('../oas20/oas20RootConverter');
const Oas20SecurityDefinitionConverter = require('../oas20/oas20SecurityDefinitionConverter');
const Oas20ResourceConverter = require('../oas20/oas20ResourceConverter');
const Oas20DefinitionConverter = require('../oas20/oas20DefinitionConverter');
const Oas20TraitConverter = require('../oas20/oas20TraitConverter');

class Oas20Converter extends Converter {
	
	loadFile(dataOrPath:any, options:any) {
		return new Promise((resolve, reject) => {
			const validateOptions = _.cloneDeep(options || {});
			const validate = options && (options.validate === true || options.validateImport === true);
			validateOptions.validate = { schema: validate, spec: validate};
			
			const dataCopy = _.cloneDeep(dataOrPath);
			parser.validate(dataCopy, validateOptions)
				.then(() => {
					this._doParseData(dataOrPath, options || {}, resolve, reject);
				})
				.catch(reject);
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
	
	export(model:Root) {
		return new Promise((resolve, reject) => {
			try {
				Oas20Converter.fixInheritedProperties(model);
				
				const rootConverter = new Oas20RootConverter();
				const oasDef = rootConverter.export(model);
				oasDef.swagger = '2.0';
				if (model.hasOwnProperty('securityDefinitions')){
					const securityDefinitionConverter = new Oas20SecurityDefinitionConverter();
					const securityDef = securityDefinitionConverter.export(model.securityDefinitions);
					if (!_.isEmpty(securityDef)) oasDef.securityDefinitions = securityDef;
				}
				const definitionConverter = new Oas20DefinitionConverter();
				if (model.hasOwnProperty('types')) oasDef.definitions = definitionConverter.export(model.types);
				const traitConverter = new Oas20TraitConverter();
				if (model.hasOwnProperty('traits')) {
					const traitsDef: any = traitConverter.export(model.traits);
					if (!_.isEmpty(traitsDef.parameters)) oasDef.parameters = traitsDef.parameters;
					if (!_.isEmpty(traitsDef.responses)) oasDef.responses = traitsDef.responses;
				}
				const resourceConverter = new Oas20ResourceConverter(model, null, oasDef);
				if (model.hasOwnProperty('resources')) {
					oasDef.paths = resourceConverter.export(model.resources);
				} else {
					oasDef.paths = {};
				}
				
				resolve(oasDef);
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
		if (oasDef.hasOwnProperty('paths')) model.resources = resourceConverter.import(oasDef.paths);

		return model;
	}
	
	static fixInheritedProperties(model:Root) {
		const map = [];
		const resourceTypes: ResourceType[] = model.resourceTypes;
		const traits: Trait[] = model.traits;
		if (model.hasOwnProperty('resources')) {
			const resources: Resource[] = model.resources;
			for (let i = 0; i < resources.length; i++) {
				const resource: Resource = resources[i];
				if (resource.hasOwnProperty('resourceType')) {
					const resourceType: Item[] = resource.resourceType;
					for (let j = 0; j < resourceType.length; j++) {
						const type = resourceType[j];
						const usedTypeName: string = type.name;
						const usedResourceType: ResourceType = resourceTypes.filter(function (rt) { return usedTypeName === rt.name; })[0];
						if (!usedResourceType) continue;
						
						const usedResource: Resource = usedResourceType.resource;
						if (usedResource && usedResource.hasOwnProperty('parameters')) {
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
						if (usedResource && usedResource.hasOwnProperty('methods')) {
							const methods: Method[] = usedResource.methods;
							for (let k = 0; k < methods.length; k++) {
								const method = methods[k];
								Oas20Converter.mapMethodProperties(map, method, null, resource.path, method.method, type.value);
							}
						}
					}
				}
				if (resource.hasOwnProperty('is')) {
					const isList: Item[] = resource.is;
					for (let j = 0; j < isList.length; j++) {
						const is: Item = isList[j];
						const usedTraitName: string = is.name;
						const usedTrait: Trait = traits.filter(function (trait) { return usedTraitName === trait.name; })[0];
						if (usedTrait && usedTrait.method) Oas20Converter.mapMethodProperties(map, usedTrait.method, usedTrait.name, resource.path, 'all', is.value);
					}
				}
				if (resource.hasOwnProperty('methods')) {
					const methods: Method[] = resource.methods;
					for (let j = 0; j < methods.length; j++) {
						const method: Method = methods[j];
						if (method.hasOwnProperty('is')) {
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
				const userMethods: Method[] = userResource.methods.filter(function (method) { return item.method === 'all' || method.method === item.method; });
				for (let m = 0; m < userMethods.length; m++) {
					const userMethod: Method = userMethods[m];
					if (item.type === 'header' && userMethod && item.trait) {
						const headerNames = userMethod.headers.map(function (header) { return header.name; });
						if (headerNames.includes(item.name)) {
							userMethod.headers.splice(headerNames.indexOf(item.name), 1);
							const header = new Header();
							const trait: string = item.trait ? item.trait : '';
							header.reference = '#/parameters/trait:' + trait + ':' + item.name;
							userMethod.headers.push(header);
						}
					} else if (item.type === 'queryParameter' && item.trait) {
						const parameterNames = userMethod.parameters.map(function (parameter) { return parameter.name; });
						if (parameterNames.includes(item.name)) {
							userMethod.parameters.splice(parameterNames.indexOf(item.name), 1);
							const parameter = new Parameter();
							const trait: string = item.trait ? item.trait : '';
							parameter.reference = '#/parameters/trait:' + trait + ':' + item.name;
							userMethod.parameters.push(parameter);
						}
					} else if (item.type === 'response' && item.trait) {
						const responseCodes = userMethod.responses.map(function (response) { return response.httpStatusCode; });
						if (responseCodes.includes(item.name)) {
							userMethod.responses.splice(responseCodes.indexOf(item.name), 1);
							const response = new Response();
							response.httpStatusCode = item.name;
							response.reference = '#/responses/trait:' + item.trait + ':' + item.name;
							userMethod.responses.push(response);
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
	
	static mapMethodProperties(map, method:Method, traitName, resourcePath, methodName, params) {
		if (method.hasOwnProperty('bodies')) {
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
		if (method.hasOwnProperty('headers')) {
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
		if (method.hasOwnProperty('parameters')) {
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
		if (method.hasOwnProperty('responses')) {
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
}

module.exports = Oas20Converter;
