const _ = require('lodash');
const Resource = require('../model/resource');
const Converter = require('../model/converter');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');
const raml10Helper = require('../helpers/raml10');

class Raml10ResourceConverter extends Converter {
	
	export(models) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		models.map(resource => {
			result[resource.relativePath] = this._export(resource);
		});
		
		return result;
	}
	
	// exports 1 resource definition
	_export(model) {
		const attrIdMap = {
			'resourceType': 'type'
		};

		const attrIdSkip = ['path', 'relativePath', 'methods', 'resources'];
		
		const ramlDef = Raml10ResourceConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);
		
		if (model.hasOwnProperty('methods')) {
			if (_.isArray(model.methods) && !_.isEmpty(model.methods)) {
				const raml10DefinitionConverter = new Raml10DefinitionConverter();
				for (const id in model.methods) {
					if (!model.methods.hasOwnProperty(id)) continue;
					
					const value = model.methods[id];
					const method = {};
					if (value.hasOwnProperty('description')) method.description = value.description;
					if (value.hasOwnProperty('displayName')) method.displayName = value.displayName;
					if (value.hasOwnProperty('is')) method.is = value.is;
					if (value.hasOwnProperty('responses')) {
						if (_.isArray(value.responses) && !_.isEmpty(value.responses)) {
							const responses = {}
							for (const index in value.responses) {
								if (!value.responses.hasOwnProperty(index)) continue;
								
								const val = value.responses[index];
								if (val.hasOwnProperty('httpStatusCode')) {
									const response = {};
									if (val.hasOwnProperty('description')) response.description = val.description;
									if (val.hasOwnProperty('definition')) {
										const body = {};
										body['application/json'] = raml10DefinitionConverter._export(val.definition);
										response.body = body;
									}
									responses[val.httpStatusCode] = response;
								}
							}
							method.responses = responses;
						}
					}
					if (value.hasOwnProperty('headers')) {
						if (_.isArray(value.headers) && !_.isEmpty(value.headers)) {
							const headers = {}
							for (const index in value.headers) {
								if (!value.headers.hasOwnProperty(index)) continue;
								
								const val = value.headers[index];
								headers[val.name] = raml10DefinitionConverter._export(val.definition);
							}
							method.headers = headers;
						}
					}
					if (value.hasOwnProperty('body')) {
						const body = {};
						const val = value.body;
						body['application/json'] = raml10DefinitionConverter._export(val.definition);
						method.body = body;
					}
					ramlDef[value.name] = method;
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
	
	static copyObjectFrom(object, attrIdMap, attrIdSkip) {
		const result = {};
		
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;
			
			if (attrIdSkip.indexOf(id) < 0) {
				result[attrIdMap.hasOwnProperty(id) ? attrIdMap[id] : id] = object[id];
			}
		}
		
		return result;
	}

	import(ramlDef) {
		const result = [];
		if (_.isEmpty(ramlDef)) return result;
		
		raml10Helper.removePropertyFromObject(ramlDef, 'typePropertyKind');
		raml10Helper.removePropertyFromObject(ramlDef, 'structuredExample');
		raml10Helper.removePropertyFromObject(ramlDef, 'fixedFacets');
		for (const id in ramlDef) {
			if (!ramlDef.hasOwnProperty(id)) continue;
			
			result.push(this._import(ramlDef[id]));
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
		
		if (ramlDef.hasOwnProperty('methods')) {
			if (_.isArray(ramlDef.methods) && !_.isEmpty(ramlDef.methods)) {
				const raml10DefinitionConverter = new Raml10DefinitionConverter();
				const modelMethods = [];
				for (const id in ramlDef.methods) {
					if (!ramlDef.methods.hasOwnProperty(id)) continue;
					
					const value = ramlDef.methods[id];
					// modelMethods[id] = this._import(value);
					const method = {};
					if (value.hasOwnProperty('method')) method.name = value.method;
					if (value.hasOwnProperty('description')) method.description = value.description;
					if (value.hasOwnProperty('displayName')) method.displayName = value.displayName;
					if (value.hasOwnProperty('is')) method.is = value.is;
					if (value.hasOwnProperty('responses')) {
						const methodResponses = [];
						for (const code in value.responses) {
							if (!value.responses.hasOwnProperty(code)) continue;
								
							const val = value.responses[code];
							let response = { httpStatusCode: code };
							if (val.hasOwnProperty('description')) response.description = val.description;
							if (val.hasOwnProperty('body')) {
								const definition = val.body[Object.keys(val.body)[0]];
								response.definition = raml10DefinitionConverter._import(definition);
							}
							methodResponses.push(response);
						}
						method.responses = methodResponses;
					}
					if (value.hasOwnProperty('headers')) {
						const methodHeaders = [];
						for (const name in value.headers) {
							if (!value.headers.hasOwnProperty(name)) continue;
							
							const val = value.headers[name];
							let header = { name: name };
							header.definition = raml10DefinitionConverter._import(val);
							methodHeaders.push(header);
						}
						method.headers = methodHeaders;
					}
					if (value.hasOwnProperty('body')) {
						const definition = value.body[Object.keys(value.body)[0]];
						const body = { definition: raml10DefinitionConverter._import(definition) };
						method.body = body;
					}
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
}

module.exports = Raml10ResourceConverter;