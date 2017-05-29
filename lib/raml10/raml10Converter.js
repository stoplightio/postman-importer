const _ = require('lodash');
const Converter = require('../model/converter');
const parser = require('raml-1-parser');
const Raml10RootConverter = require('../raml10/Raml10RootConverter');
const Raml10SecurityDefinitionConverter = require('../raml10/Raml10SecurityDefinitionConverter');
const Raml10ResourceConverter = require('../raml10/Raml10ResourceConverter');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');
const Raml10ResourceTypeConverter = require('../raml10/Raml10ResourceTypeConverter');
const Raml10TraitConverter = require('../raml10/Raml10TraitConverter');
const Raml10AnnotationTypeConverter = require('../raml10/Raml10AnnotationTypeConverter');

class Raml10Converter extends Converter {

	loadFile(filePath, options) {
		return new Promise((resolve, reject) => {
			parser.loadApi(filePath, Converter._options(options)).then((api) => {
				try {
					this.data = api.expand(true).toJSON({ serializeMetadata: false });
					resolve();
				}
				catch (e) {
					reject(e);
				}
			}).catch(reject);
		});
	}
	
	export(model) {
		return new Promise((resolve, reject) => {
			try {
				Raml10Converter.fixInheritedProperties(model);
				
				const rootConverter = new Raml10RootConverter(model);
				const ramlDef = rootConverter.export(model);
				const securityDefinitionConverter = new Raml10SecurityDefinitionConverter(model, rootConverter.annotationPrefix, ramlDef);
				if (model.securityDefinitions) ramlDef.securitySchemes = securityDefinitionConverter.export(model.securityDefinitions);
				const definitionConverter = new Raml10DefinitionConverter(model, rootConverter.annotationPrefix, ramlDef);
				if (model.types) ramlDef.types = definitionConverter.export(model.types);
				const resourceTypeConverter = new Raml10ResourceTypeConverter();
				if (model.resourceTypes) ramlDef.resourceTypes = resourceTypeConverter.export(model.resourceTypes);
				const traitConverter = new Raml10TraitConverter(model, rootConverter.annotationPrefix, ramlDef);
				if (model.traits) ramlDef.traits = traitConverter.export(model);
				if (ramlDef.traits && _.isEmpty(ramlDef.traits)) delete ramlDef.traits;
				const annotationTypeConverter = new Raml10AnnotationTypeConverter(model, rootConverter.annotationPrefix, ramlDef);
				if (model.annotationTypes) ramlDef.annotationTypes = annotationTypeConverter.export(model.annotationTypes);
				const resourceConverter = new Raml10ResourceConverter(model, rootConverter.annotationPrefix, ramlDef);
				if (model.resources) _.merge(ramlDef, resourceConverter.export(model.resources));

				resolve(ramlDef);
			} catch (err) {
				reject(err);
			}
		});
	}

	import(ramlDef) {
		const rootConverter = new Raml10RootConverter();
		const model = rootConverter.import(ramlDef);
		const securityDefinitionConverter = new Raml10SecurityDefinitionConverter();
		if (ramlDef.securitySchemes) model.securityDefinitions = securityDefinitionConverter.import(ramlDef.securitySchemes);
		const definitionConverter = new Raml10DefinitionConverter();
		if (ramlDef.types) model.types = definitionConverter.import(ramlDef.types);
		else if (ramlDef.schemas) model.types = definitionConverter.import(ramlDef.schemas);
		const resourceTypeConverter = new Raml10ResourceTypeConverter();
		if (ramlDef.resourceTypes) model.resourceTypes = resourceTypeConverter.import(ramlDef.resourceTypes);
		const traitConverter = new Raml10TraitConverter();
		if (ramlDef.traits) model.traits = traitConverter.import(ramlDef.traits);
		const resourceConverter = new Raml10ResourceConverter(model);
		if (ramlDef.resources) model.resources = resourceConverter.import(ramlDef.resources);
		const annotationTypeConverter = new Raml10AnnotationTypeConverter(model);
		if (ramlDef.annotationTypes) model.annotationTypes = annotationTypeConverter.import(ramlDef.annotationTypes);

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
					const usedResource = usedResourceType.resource;
					if (usedResource.hasOwnProperty('parameters')) {
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
					if (usedResource.hasOwnProperty('methods')) {
						for (const k in usedResource.methods) {
							if (!usedResource.methods.hasOwnProperty(k)) continue;
							
							const method = usedResource.methods[k];
							Raml10Converter.mapMethodProperties(map, method, null, resource.path, method.method, type.value);
						}
					}
				}
			}
			if (resource.hasOwnProperty('is')) {
				for (const j in resource.is) {
					const is = resource.is[j];
					const usedTraitName = is.name;
					const usedTrait = traits.filter(function (trait) { return usedTraitName === trait.name; })[0];
					if (usedTrait) Raml10Converter.mapMethodProperties(map, usedTrait.method, usedTrait.name, resource.path, 'all', is.value);
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
						if (usedTrait) Raml10Converter.mapMethodProperties(map, usedTrait.method, usedTrait.name, resource.path, method.method, is.value);
					}
				}
			}
		}
		
		for (const id in map) {
			if (!map.hasOwnProperty(id)) continue;
			
			const item = map[id];
			const userResource = resources.filter(function (resource) { return resource.path === item.resource; })[0];
			if (!userResource.hasOwnProperty('methods')) continue;
			const userMethod = userResource.methods.filter(function (method) { return item.method === 'all' || method.method === item.method; })[0];
			if (item.type === 'body' && userMethod.bodies) {
				const bodyMimeTypes = userMethod.bodies.map(function (body) { return body.mimeType });
				if (bodyMimeTypes.includes(item.name)) userMethod.bodies.splice(bodyMimeTypes.indexOf(item.name), 1);
			} else if (item.type === 'header' && userMethod.headers) {
				const headerNames = userMethod.headers.map(function (header) { return header.name });
				if (headerNames.includes(item.name)) userMethod.headers.splice(headerNames.indexOf(item.name), 1);
			} else if (item.type === 'queryParameter' && userMethod.parameters) {
				const parameterNames = userMethod.parameters.map(function (parameter) { return parameter.name });
				if (parameterNames.includes(item.name)) userMethod.parameters.splice(parameterNames.indexOf(item.name), 1);
			} else if (item.type === 'uriParameter' && userResource.parameters) {
				const parameterNames = userResource.parameters.map(function (parameter) { return parameter.name });
				if (parameterNames.includes(item.name)) userResource.parameters.splice(parameterNames.indexOf(item.name), 1);
			} else if (item.type === 'response' && userMethod.responses) {
				const responseCodes = userMethod.responses.map(function (response) { return response.httpStatusCode });
				if (responseCodes.includes(item.name)) userMethod.responses.splice(responseCodes.indexOf(item.name), 1);
			}
		}
	}
	
	static mapMethodProperties(map, method, traitName, resourcePath, methodName, params) {
		if (method.hasOwnProperty('bodies')) {
			for (const l in method.bodies) {
				if (!method.bodies.hasOwnProperty(l)) continue;
				
				const body = method.bodies[l];
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
		if (method.hasOwnProperty('headers')) {
			for (const l in method.headers) {
				if (!method.headers.hasOwnProperty(l)) continue;
				
				const header = method.headers[l];
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
		if (method.hasOwnProperty('parameters')) {
			for (const l in method.parameters) {
				if (!method.parameters.hasOwnProperty(l)) continue;
				
				const parameter = method.parameters[l];
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
		if (method.hasOwnProperty('responses')) {
			for (const l in method.responses) {
				if (!method.responses.hasOwnProperty(l)) continue;
				
				const response = method.responses[l];
				const mimeTypes = response.bodies.map(body => body.mimeType);
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

module.exports = Raml10Converter;