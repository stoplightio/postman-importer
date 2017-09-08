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

const Oas30RootConverter = require('./oas30RootConverter');
const Oas30SecurityDefinitionConverter = require('./oas30SecurityDefinitionConverter');
const Oas30DefinitionConverter = require('./oas30DefinitionConverter');
const Oas30TraitConverter = require('./oas30TraitConverter');
const Oas30ResourceConverter = require('./oas30ResourceConverter');

import type { Model, SecurityScheme, Components } from './oas30Types';

class Oas30Converter extends Converter {
	export(model: Root): Promise<Model> {
		return new Promise((resolve, reject) => {
			try {
				Oas30Converter.fixInheritedProperties(model);

				const rootConverter = new Oas30RootConverter();
				const oasDef: Model = rootConverter.export(model);

				if (model.securityDefinitions != null) {
					const securityDefinitionConverter = new Oas30SecurityDefinitionConverter();
					const securityDef: SecurityScheme = securityDefinitionConverter.export(model.securityDefinitions);
					const components: Components = oasDef.components;
					if (!_.isEmpty(securityDef)) components.securitySchemes = securityDef;
				}

				if (model.types != null) {
					const definitionConverter = new Oas30DefinitionConverter(model, null, oasDef);
					oasDef.components.schemas = definitionConverter.export(model.types);
				}

				if (model.traits != null) {
					const traitConverter = new Oas30TraitConverter();
					const traitsDef: any = traitConverter.export(model.traits);
					oasDef.components.parameters = traitsDef.parameters;
					oasDef.components.responses = traitsDef.responses;
				}

				if (model.resources != null) {
					const resourceConverter = new Oas30ResourceConverter(model, null, oasDef);
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

	static fixInheritedProperties(model:Root) {
		const map = [];
		const resourceTypes: ?ResourceType[] = model.resourceTypes;
		const traits: ?Trait[] = model.traits;
		if (model.resources != null) {
			const resources: Resource[] = model.resources;
			for (let i = 0; i < resources.length; i++) {
				const resource: Resource = resources[i];
				if (resource.hasOwnProperty('resourceType')) {
					const resourceType: ?Item[] = resource.resourceType;
					if (resourceType != null && resourceTypes != null) {
						for (let j = 0; j < resourceType.length; j++) {
							const type = resourceType[j];
							const usedTypeName: string = type.name;
							const usedResourceType: ResourceType = resourceTypes.filter(function (rt) { return usedTypeName === rt.name; })[0];
							if (!usedResourceType) continue;

							const usedResource: ?Resource = usedResourceType.resource;
							if (usedResource && usedResource.parameters != null) {
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
							if (usedResource && usedResource.methods != null) {
								const methods: Method[] = usedResource.methods;
								for (let k = 0; k < methods.length; k++) {
									const method = methods[k];
									Oas30Converter.mapMethodProperties(map, method, null, resource.path, method.method, type.value);
								}
							}
						}
					}
				}
				if (resource.is != null && traits != null) {
					const isList: Item[] = resource.is;
					for (let j = 0; j < isList.length; j++) {
						const is: Item = isList[j];
						const usedTraitName: string = is.name;
						const usedTrait: Trait = traits.filter(function (trait) { return usedTraitName === trait.name; })[0];
						if (usedTrait && usedTrait.method) Oas30Converter.mapMethodProperties(map, usedTrait.method, usedTrait.name, resource.path, 'all', is.value);
					}
				}
				if (resource.methods != null) {
					const methods: Method[] = resource.methods;
					for (let j = 0; j < methods.length; j++) {
						const method: Method = methods[j];
						if (method.is != null && traits != null) {
							const isList: Item[] = method.is;
							for (let k = 0; k < isList.length; k++) {
								const is: Item = isList[k];
								const usedTraitName: string = is.name;
								const usedTrait: Trait = traits.filter(function (trait) { return usedTraitName === trait.name; })[0];
								if (usedTrait && usedTrait.method) Oas30Converter.mapMethodProperties(map, usedTrait.method, usedTrait.name, resource.path, method.method, is.value);
							}
						}
					}
				}
			}
			for (let i = 0; i < map.length; i++) {
				const item = map[i];
				const userResource: Resource = resources.filter(function (resource) { return resource.path === item.resource; })[0];
				if (!userResource.hasOwnProperty('methods')) continue;
				if (userResource.methods != null) {
					const userMethods: Method[] = userResource.methods.filter(function (method) { return item.method === 'all' || method.method === item.method; });
					for (let m = 0; m < userMethods.length; m++) {
						const userMethod: Method = userMethods[m];
						if (item.type === 'header' && userMethod != null && userMethod.headers != null && item.trait != null) {
							const headers: Header[] = userMethod.headers;
							const headerNames = headers.map(header => header.name);
							if (headerNames.includes(item.name)) {
								headers.splice(headerNames.indexOf(item.name), 1);
								const header = new Header();
								const trait: string = item.trait ? item.trait : '';
								header.reference = '#/components/parameters/trait_' + trait + '_' + item.name;
								headers.push(header);
							}
						} else if (item.type === 'queryParameter' && userMethod != null && userMethod.parameters != null && item.trait != null) {
							const parameters: Parameter[] = userMethod.parameters;
							const parameterNames = parameters.map(parameter => parameter.name);
							if (parameterNames.includes(item.name)) {
								parameters.splice(parameterNames.indexOf(item.name), 1);
								const parameter = new Parameter();
								const trait: string = item.trait ? item.trait : '';
								parameter.reference = '#/components/parameters/trait_' + trait + '_' + item.name;
								parameters.push(parameter);
							}
						} else if (item.type === 'response' && userMethod != null && userMethod.responses != null && item.trait != null) {
							const responses: Response[] = userMethod.responses;
							const responseCodes = responses.map(response => response.httpStatusCode);
							if (responseCodes.includes(item.name)) {
								responses.splice(responseCodes.indexOf(item.name), 1);
								const response = new Response();
								response.httpStatusCode = item.name;
								response.reference = '#/components/responses/trait_' + item.trait + '_' + item.name;
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
		if (method.bodies != null) {
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
		if (method.headers != null) {
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
		if (method.parameters != null) {
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
		if (method.responses != null) {
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

module.exports = Oas30Converter;
