const _ = require('lodash');
const Parameter = require('../model/parameter');
const Response = require('../model/response');
const Converter = require('../model/converter');
const parser = require('swagger-parser');
const Oas20RootConverter = require('../oas20/Oas20RootConverter');
const Oas20SecurityDefinitionConverter = require('../oas20/Oas20SecurityDefinitionConverter');
const Oas20ResourceConverter = require('../oas20/Oas20ResourceConverter');
const Oas20DefinitionConverter = require('../oas20/Oas20DefinitionConverter');
const Oas20TraitConverter = require('../oas20/Oas20TraitConverter');

class Oas20Converter extends Converter {
	
	loadFile(dataOrPath, options) {
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
	
	_doParseData(dataOrPath, options, resolve, reject) {
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
	
	export(model) {
		return new Promise((resolve, reject) => {
			try {
				Oas20Converter.fixInheritedProperties(model);
				
				const rootConverter = new Oas20RootConverter();
				const oasDef = rootConverter.export(model);
				oasDef.swagger = "2.0";
				if (model.hasOwnProperty('securityDefinitions')){
					const securityDefinitionConverter = new Oas20SecurityDefinitionConverter();
					const securityDef = securityDefinitionConverter.export(model.securityDefinitions);
					if (!_.isEmpty(securityDef)) oasDef.securityDefinitions = securityDef;
				}
				const definitionConverter = new Oas20DefinitionConverter();
				if (model.hasOwnProperty('types')) oasDef.definitions = definitionConverter.export(model.types);
				const traitConverter = new Oas20TraitConverter();
				if (model.hasOwnProperty('traits')) {
					const traitsDef = traitConverter.export(model.traits);
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

	import(oasDef) {
		const rootConverter = new Oas20RootConverter();
		const model = rootConverter.import(oasDef);
		const securityDefinitionConverter = new Oas20SecurityDefinitionConverter(model, oasDef.dereferencedAPI.securityDefinitions);
		if (oasDef.hasOwnProperty('securityDefinitions') && !_.isEmpty(oasDef.securityDefinitions)) model.securityDefinitions = securityDefinitionConverter.import(oasDef.securityDefinitions);
		const definitionConverter = new Oas20DefinitionConverter(model);
		if (oasDef.hasOwnProperty('definitions')) model.types = definitionConverter.import(oasDef.definitions);
		const traitConverter = new Oas20TraitConverter(model, oasDef.dereferencedAPI.parameters);
		if (oasDef.hasOwnProperty('parameters') || oasDef.hasOwnProperty('responses')) {
			model.traits = traitConverter.import({
				parameters: oasDef.parameters,
				responses: oasDef.responses
			});
		}
		const resourceConverter = new Oas20ResourceConverter(model, oasDef.dereferencedAPI.paths);
		if (oasDef.hasOwnProperty('paths')) model.resources = resourceConverter.import(oasDef.paths);

		return model;
	}
	
	static fixInheritedProperties(model) {
		const map = [];
		const resourceTypes = model.resourceTypes;
		const traits = model.traits;
		const resources = model.resources;
		
		for (const i in resources) {
			if (!resources.hasOwnProperty(i)) continue;
			
			const resource = resources[i];
			if (resource.hasOwnProperty('resourceType')) {
				for (const j in resource.resourceType) {
					if (!resource.resourceType.hasOwnProperty(j)) continue;

					const type = resource.resourceType[j];
					const usedTypeName = type.name;
					const usedResourceType = resourceTypes.filter(function (resourceType) { return usedTypeName === resourceType.name; })[0];
					if (!usedResourceType) continue;

					const usedResource = usedResourceType.resource;
					if (usedResource && usedResource.hasOwnProperty('parameters')) {
						for (const k in usedResource.parameters) {
							if (!usedResource.parameters.hasOwnProperty(k)) continue;
							
							const parameter = usedResource.parameters[k];
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
						for (const k in usedResource.methods) {
							if (!usedResource.methods.hasOwnProperty(k)) continue;
							
							const method = usedResource.methods[k];
							Oas20Converter.mapMethodProperties(map, method, null, resource.path, method.method, type.value);
						}
					}
				}
			}
			if (resource.hasOwnProperty('is')) {
				for (const j in resource.is) {
					const is = resource.is[j];
					const usedTraitName = is.name;
					const usedTrait = traits.filter(function (trait) { return usedTraitName === trait.name; })[0];
					if (usedTrait) Oas20Converter.mapMethodProperties(map, usedTrait.method, usedTrait.name, resource.path, 'all', is.value);
				}
			}
			for (const j in resource.methods) {
				if (!resource.methods.hasOwnProperty(j)) continue;
				
				const method = resource.methods[j];
				if (method.hasOwnProperty('is')) {
					for (const k in method.is) {
						const is = method.is[k];
						const usedTraitName = is.name;
						const usedTrait = traits.filter(function (trait) { return usedTraitName === trait.name; })[0];
						if (usedTrait) Oas20Converter.mapMethodProperties(map, usedTrait.method, usedTrait.name, resource.path, method.method, is.value);
					}
				}
			}
		}
		
		for (const id in map) {
			if (!map.hasOwnProperty(id)) continue;
			
			const item = map[id];
			const userResource = resources.filter(function (resource) { return resource.path === item.resource; })[0];
			if (!userResource.hasOwnProperty('methods')) continue;
			const userMethods = userResource.methods.filter(function (method) { return item.method === 'all' || method.method === item.method; });
			for (const m in userMethods) {
				const userMethod = userMethods[m];
				if (item.type === 'header' && userMethod && item.trait) {
					const headerNames = userMethod.headers.map(function (header) { return header.name });
					if (headerNames.includes(item.name)) {
						userMethod.headers.splice(headerNames.indexOf(item.name), 1);
						const header = new Parameter();
						header.reference = '#/parameters/trait:' + item.trait + ':' + item.name;
						userMethod.headers.push(header);
					}
				} else if (item.type === 'queryParameter' && item.trait) {
					const parameterNames = userMethod.parameters.map(function (parameter) { return parameter.name });
					if (parameterNames.includes(item.name)) {
						userMethod.parameters.splice(parameterNames.indexOf(item.name), 1);
						const parameter = new Parameter();
						parameter.reference = '#/parameters/trait:' + item.trait + ':' + item.name;
						userMethod.parameters.push(parameter);
					}
				} else if (item.type === 'response' && item.trait) {
					const responseCodes = userMethod.responses.map(function (response) { return response.httpStatusCode });
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
	
	static mapMethodProperties(map, method, traitName, resourcePath, methodName, params) {
		if (method.hasOwnProperty('bodies')) {
			for (const i in method.bodies) {
				if (!method.bodies.hasOwnProperty(i)) continue;
				
				const body = method.bodies[i];
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
			for (const i in method.headers) {
				if (!method.headers.hasOwnProperty(i)) continue;
				
				const header = method.headers[i];
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
			for (const i in method.parameters) {
				if (!method.parameters.hasOwnProperty(i)) continue;
				
				const parameter = method.parameters[i];
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
			for (const i in method.responses) {
				if (!method.responses.hasOwnProperty(i)) continue;
				
				const response = method.responses[i];
				const mimeTypes = response.bodies? response.bodies.map(body => body.mimeType) : [];
				if (!response.hasParams) {
					const item = {
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