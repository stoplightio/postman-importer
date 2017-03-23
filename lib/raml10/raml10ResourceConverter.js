const _ = require('lodash');
const Resource = require('../model/resource');
const Method = require('../model/method');
const Response = require('../model/response');
const Parameter = require('../model/parameter');
const Body = require('../model/body');
const Converter = require('../model/converter');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');
const raml10Helper = require('../helpers/raml10');

class Raml10ResourceConverter extends Converter {
	
	export(models) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		models.map(model => {
			if (!model.hasOwnProperty('parentPath'))
				result[model.relativePath] = this._export(model);
		});
		
		return result;
	}
	
	// exports 1 resource definition
	_export(model) {
		const attrIdMap = {
			'resourceType': 'type'
		};

		const attrIdSkip = ['path', 'relativePath', 'methods', 'resources', 'parameters'];
		const ramlDef = Raml10ResourceConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);
		const raml10DefinitionConverter = new Raml10DefinitionConverter();
		
		if (model.hasOwnProperty('parameters')) {
			if (_.isArray(model.parameters) && !_.isEmpty(model.parameters)) {
				const parameters = {};
				for (const id in model.parameters) {
					if (!model.parameters.hasOwnProperty(id)) continue;
					
					const value = model.parameters[id];
					parameters[value.name] = raml10DefinitionConverter._export(value.definition);
				}
				ramlDef.uriParameters = parameters;
			}
		}
		
		if (model.hasOwnProperty('methods')) {
			if (_.isArray(model.methods) && !_.isEmpty(model.methods)) {
				for (const id in model.methods) {
					if (!model.methods.hasOwnProperty(id)) continue;
					
					const value = model.methods[id];
					const method = {};
					if (value.hasOwnProperty('description')) method.description = value.description;
					if (value.hasOwnProperty('name')) method.displayName = value.name;
					if (value.hasOwnProperty('is')) method.is = value.is;
					if (value.hasOwnProperty('responses')) {
						if (_.isArray(value.responses) && !_.isEmpty(value.responses)) {
							const responses = {};
							for (const index in value.responses) {
								if (!value.responses.hasOwnProperty(index)) continue;
								
								const val = value.responses[index];
								if (val.hasOwnProperty('httpStatusCode')) {
									const response = {};
									if (val.hasOwnProperty('description')) response.description = val.description;
									const body = Raml10ResourceConverter.exportBodies(val, raml10DefinitionConverter);
									if (!_.isEmpty(body)) response.body = body;
									responses[val.httpStatusCode] = response;
								}
							}
							method.responses = responses;
						}
					}
					if (value.hasOwnProperty('headers')) {
						if (_.isArray(value.headers) && !_.isEmpty(value.headers)) {
							const headers = {};
							for (const index in value.headers) {
								if (!value.headers.hasOwnProperty(index)) continue;
								
								const val = value.headers[index];
								headers[val.name] = raml10DefinitionConverter._export(val.definition);
							}
							method.headers = headers;
						}
					}
					const body = Raml10ResourceConverter.exportBodies(value, raml10DefinitionConverter);
					if (!_.isEmpty(body)) method.body = body;
					ramlDef[value.method] = method;
				}
			}
		}
		
		if (model.hasOwnProperty('resources')) {
			if (_.isArray(model.resources) && !_.isEmpty(model.resources)) {
				for (const id in model.resources) {
					if (!model.resources.hasOwnProperty(id)) continue;

					const value = model.resources[id];
					ramlDef[value.relativePath] = this._export(value);
				}
			}
		}
		
		return ramlDef;
	}
	
	static exportBodies(object, converter) {
		const body = {};
		if (object.hasOwnProperty('bodies')) {
			if (_.isArray(object.bodies) && !_.isEmpty(object.bodies)) {
				for (const index in object.bodies) {
					if (!object.bodies.hasOwnProperty(index)) continue;
					
					const val = object.bodies[index];
					body[val.mimeType] = converter._export(val.definition)
				}
			}
		}
		return body;
	}
	
	static copyObjectFrom(object, attrIdMap, attrIdSkip) {
		const result = new Resource();
		
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;
			
			if (attrIdSkip.indexOf(id) < 0) {
				result[attrIdMap.hasOwnProperty(id) ? attrIdMap[id] : id] = object[id];
			}
		}
		
		return result;
	}

	import(ramlDefs) {
		let result = [];
		if (_.isEmpty(ramlDefs)) return result;
		
		raml10Helper.removePropertyFromObject(ramlDefs, 'typePropertyKind');
		raml10Helper.removePropertyFromObject(ramlDefs, 'structuredExample');
		raml10Helper.removePropertyFromObject(ramlDefs, 'fixedFacets');
		for (const id in ramlDefs) {
			if (!ramlDefs.hasOwnProperty(id)) continue;
			
			const ramlDef = ramlDefs[id];
			result.push(this._import(ramlDef));
			if (ramlDef.hasOwnProperty('resources') && _.isArray(ramlDef.resources)) {
				let models = this.import(ramlDef.resources);
				for (const index in models) {
					if (!models.hasOwnProperty(index)) continue;
					
					models[index].parentPath = ramlDef.absoluteUri;
				}
				result = result.concat(models);
			}
		}
		return result;
	}

	// imports 1 resource definition
	_import(ramlDef) {
		const attrIdMap = {
			'type': 'resourceType',
			'absoluteUri': 'path',
			'relativeUri': 'relativePath'
		};

		const attrIdSkip = ['methods', 'resources', 'relativeUriPathSegments', 'uriParameters', 'annotations'];
		const model = Raml10ResourceConverter.copyObjectFrom(ramlDef, attrIdMap, attrIdSkip);
		const raml10DefinitionConverter = new Raml10DefinitionConverter();
		
		if (ramlDef.hasOwnProperty('uriParameters')) {
			if (!_.isEmpty(ramlDef.uriParameters)) {
				const modelParameters = [];
				for (const id in ramlDef.uriParameters) {
					if (!ramlDef.uriParameters.hasOwnProperty(id)) continue;
					
					const value = ramlDef.uriParameters[id];
					const parameter = new Parameter();
					parameter.name = id;
					parameter.definition = raml10DefinitionConverter._import(value);
					modelParameters.push(parameter);
				}
				model.parameters = modelParameters;
			}
		}
		
		if (ramlDef.hasOwnProperty('methods')) {
			if (_.isArray(ramlDef.methods) && !_.isEmpty(ramlDef.methods)) {
				const modelMethods = [];
				for (const id in ramlDef.methods) {
					if (!ramlDef.methods.hasOwnProperty(id)) continue;
					
					const value = ramlDef.methods[id];
					const method = new Method();
					if (value.hasOwnProperty('method')) method.method = value.method;
					if (value.hasOwnProperty('description')) method.description = value.description;
					if (value.hasOwnProperty('displayName')) method.name = value.displayName;
					if (value.hasOwnProperty('is')) method.is = value.is;
					if (value.hasOwnProperty('responses')) {
						const methodResponses = [];
						for (const code in value.responses) {
							if (!value.responses.hasOwnProperty(code)) continue;
								
							const val = value.responses[code];
							let response = new Response();
							response.httpStatusCode = code;
							if (val.hasOwnProperty('description')) response.description = val.description;
							response.bodies = Raml10ResourceConverter.importBodies(val, raml10DefinitionConverter);
							methodResponses.push(response);
						}
						method.responses = methodResponses;
					}
					if (value.hasOwnProperty('headers')) {
						const methodHeaders = [];
						for (const name in value.headers) {
							if (!value.headers.hasOwnProperty(name)) continue;
							
							const val = value.headers[name];
							let header = new Parameter();
							header.name = name;
							header.definition = raml10DefinitionConverter._import(val);
							methodHeaders.push(header);
						}
						method.headers = methodHeaders;
					}
					method.bodies = Raml10ResourceConverter.importBodies(value, raml10DefinitionConverter);
					modelMethods.push(method);
				}
				model.methods = modelMethods;
			}
		}
		
		if (ramlDef.hasOwnProperty('resources')) {
			if (_.isArray(ramlDef.resources) && !_.isEmpty(ramlDef.resources)) {
				let modelResources = [];
				for (const id in ramlDef.resources) {
					if (!ramlDef.resources.hasOwnProperty(id)) continue;
					
					const value = ramlDef.resources[id];
					modelResources.push(this._import(value));
				}
				model.resources = modelResources;
			}
		}
		
		return model;
	}
	
	static importBodies(object, converter) {
		const bodies = [];
		if (object.hasOwnProperty('body')) {
			for (const mimeType in object.body) {
				if (!object.body.hasOwnProperty(mimeType)) continue;
				
				const body = new Body();
				body.mimeType = mimeType;
				body.definition = converter._import(object.body[mimeType]);
				bodies.push(body);
			}
		}
		return bodies;
	}
}

module.exports = Raml10ResourceConverter;