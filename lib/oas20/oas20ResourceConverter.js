const _ = require('lodash');
const Resource = require('../model/resource');
const Method = require('../model/method');
const Response = require('../model/response');
const Parameter = require('../model/parameter');
const Body = require('../model/body');
const Converter = require('../model/converter');
const Oas20DefinitionConverter = require('../oas20/Oas20DefinitionConverter');

class Oas20ResourceConverter extends Converter {
	
	export(models) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		models.map(model => {
			result[model.path] = this._export(model);
		});
		
		return result;
	}
	
	// exports 1 resource definition
	_export(model) {
		const attrIdMap = {};
		
		const attrIdSkip = ['path', 'relativePath', 'resourceType', 'description', 'displayName', 'methods', 'resources', 'parameters', 'parentPath'];
		const oasDef = Oas20ResourceConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);
		const oas20DefinitionConverter = new Oas20DefinitionConverter();
		
		if (model.hasOwnProperty('methods')) {
			if (_.isArray(model.methods) && !_.isEmpty(model.methods)) {
				for (const id in model.methods) {
					if (!model.methods.hasOwnProperty(id)) continue;
					
					const value = model.methods[id];
					const method = {};
					if (value.hasOwnProperty('description')) method.description = value.description;
					if (value.hasOwnProperty('responses')) {
						if (_.isArray(value.responses) && !_.isEmpty(value.responses)) {
							if (value.hasOwnProperty('name')) method.operationId = value.name; // todo: si no tiene name, agrego opeationId default como el converter actual?
							const responses = {};
							const produces = [];
							for (const index in value.responses) {
								if (!value.responses.hasOwnProperty(index)) continue;
								
								const val = value.responses[index];
								if (val.hasOwnProperty('httpStatusCode')) {
									const response = { description: '' };
									if (val.hasOwnProperty('description')) response.description = val.description;
									if (val.hasOwnProperty('bodies')) {
										if (_.isArray(val.bodies) && !_.isEmpty(val.bodies)) {
											let schema = {};
											for (const index in val.bodies) {
												if (!val.bodies.hasOwnProperty(index)) continue;
												
												const body = val.bodies[index];
												produces.push(body.mimeType);
												schema = oas20DefinitionConverter._export(body.definition) // todo: qué pasa cuando tiene más de 1 body?
											}
											if(!_.isEmpty(schema)) response.schema = schema;
										}
									}
									responses[val.httpStatusCode] = response;
								}
							}
							if (!_.isEmpty(produces)) method.produces = produces;
							method.responses = responses;
						}
					} else {
						method.responses = {
							default: {
								description: '',
								schema: {}
							}
						};
					}
					const parameters = [];
					if (value.hasOwnProperty('headers')) {
						if (_.isArray(value.headers) && !_.isEmpty(value.headers)) {
							for (const index in value.headers) {
								if (!value.headers.hasOwnProperty(index)) continue;
								
								const val = value.headers[index];
								const parameter = Object.assign({}, oas20DefinitionConverter._export(val.definition));
								parameter.in = 'header';
								parameter.name = val.definition.name; // todo: se podría definir un nuevo definition converter para parameters que exporte con name y required
								parameter.required = true; // todo: cómo se cuándo es false?
								parameters.push(parameter);
							}
						}
					}
					if (value.hasOwnProperty('bodies')) {
						if (_.isArray(value.bodies) && !_.isEmpty(value.bodies)) {
							const consumes = [];
							for (const index in value.bodies) {
								if (!value.bodies.hasOwnProperty(index)) continue;
								
								const val = value.bodies[index];
								const parameter = { in: 'body', name: 'body' }; // todo: que nombre les pongo cuando hay mas de un body
								parameter.schema = oas20DefinitionConverter._export(val.definition);
								consumes.push(val.mimeType);
								parameters.push(parameter);
							}
							method.consumes = consumes;
						}
					}
					if (!_.isEmpty(parameters)) method.parameters = parameters;
					oasDef[value.method] = method;
				}
			}
		}
		
		if (model.hasOwnProperty('parameters')) {
			if (_.isArray(model.parameters) && !_.isEmpty(model.parameters)) {
				const parameters = [];
				for (const id in model.parameters) {
					console.log(model.parameters[id].name + ' : ' + model.path.includes(model.parameters[id].name));
					if (!model.parameters.hasOwnProperty(id) || !model.path.includes(model.parameters[id].name)) continue;
					
					const value = model.parameters[id];
					console.log(value);
					const parameter = Object.assign({}, oas20DefinitionConverter._export(value.definition));
					parameter.in = 'path';
					parameter.name = value.name; // todo: se podría definir un nuevo definition converter para parameters que exporte con name y required
					parameter.required = true; // todo: cómo se cuándo es false?
					parameters.push(parameter);
				}
				oasDef.parameters = parameters;
			}
		}
		return oasDef;
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
	
	import(oasDefs) {
		const result = [];
		if (_.isEmpty(oasDefs)) return result;
		
		for (const id in oasDefs) {
			if (!oasDefs.hasOwnProperty(id)) continue;
			
			const ramlDef = this._import(oasDefs[id]);
			ramlDef.path = id;
			ramlDef.relativePath = id;
			result.push(ramlDef);
		}
		
		return result;
	}
	
	_import(oasDef) {
		const attrIdMap = {};
		
		const validMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];
		const attrIdSkip = [];
		const model = Oas20ResourceConverter.copyObjectFrom(oasDef, attrIdMap, attrIdSkip.concat(validMethods));
		const oas20DefinitionConverter = new Oas20DefinitionConverter();
		
		const methods = [];
		for (const id in oasDef) {
			if (!oasDef.hasOwnProperty(id) || !validMethods.includes(id)) continue;
			
			const value = oasDef[id];
			const method = new Method();
			method.method = id;
			if (value.hasOwnProperty('description')) method.description = value.description;
			if (value.hasOwnProperty('operationId')) method.name = value.operationId;
			const produces = []
			if (value.hasOwnProperty('produces')) produces.push(value.produces[0]); // todo: que pasa si hay más de 1 produces
			if (value.hasOwnProperty('responses')) {
				if (!_.isEmpty(value.responses)) {
					const responses = [];
					for (const index in value.responses) {
						if (!value.responses.hasOwnProperty(index)) continue;
						
						const val = value.responses[index];
						const response = new Response();
						response.httpStatusCode = index;
						if (val.hasOwnProperty('description')) response.description = val.description;
						const bodies = [];
						const body = new Body();
						body.mimeType = produces[0];
						body.definition = oas20DefinitionConverter._import(val.schema);
						bodies.push(body);
						response.bodies = bodies;
						responses.push(response);
					}
					method.responses = responses;
				}
			}
			if (value.hasOwnProperty('consumes')) {
				
			}
			methods.push(method);
		}
		model.methods = methods;
		
		if (oasDef.hasOwnProperty('parameters')) {
			if (_.isArray(oasDef.parameters) && !_.isEmpty(oasDef.parameters)) {
				const parameters = [];
				for (const id in oasDef.parameters) {
					if (!oasDef.parameters.hasOwnProperty(id)) continue;
					
					const value = oasDef.parameters[id];
					const parameter = new Parameter();
					parameter.name = value.name;
					parameter.definition = oas20DefinitionConverter._import(value);
					parameters.push(parameter);
				}
				model.parameters = parameters;
			}
		}
		
		return model;
	}
	
}

module.exports = Oas20ResourceConverter;