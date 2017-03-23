const _ = require('lodash');
const Method = require('../model/method');
const Response = require('../model/response');
const Parameter = require('../model/parameter');
const Body = require('../model/body');
const Converter = require('../model/converter');
const Oas20DefinitionConverter = require('../oas20/Oas20DefinitionConverter');

class Oas20MethodConverter extends Converter {
	
	export(models) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		models.map(model => {
			result[model.method] = this._export(model);
		});
		
		return result;
	}
	
	// exports 1 method definition
	_export(model) {
		const attrIdMap = {
			'name': 'operationId'
		};

		const attrIdSkip = ['method', 'responses', 'headers', 'bodies'];
		const oasDef = Oas20MethodConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);
		const oas20DefinitionConverter = new Oas20DefinitionConverter();
		
		if (model.hasOwnProperty('responses')) {
			if (_.isArray(model.responses) && !_.isEmpty(model.responses)) {
				if (model.hasOwnProperty('name')) oasDef.operationId = model.name; // todo: si no tiene name, agrego opeationId default como el converter actual?
				const responses = {};
				const produces = [];
				for (const id in model.responses) {
					if (!model.responses.hasOwnProperty(id)) continue;
					
					const value = model.responses[id];
					if (value.hasOwnProperty('httpStatusCode')) {
						const response = { description: '' };
						if (value.hasOwnProperty('description')) response.description = value.description;
						if (value.hasOwnProperty('bodies')) {
							if (_.isArray(value.bodies) && !_.isEmpty(value.bodies)) {
								let schema = {};
								for (const index in value.bodies) {
									if (!value.bodies.hasOwnProperty(index)) continue;
									
									const val = value.bodies[index];
									if (val.hasOwnProperty('mimeType') && val.mimeType) produces.push(val.mimeType);
									schema = oas20DefinitionConverter._export(val.definition) // todo: qué pasa cuando tiene más de 1 body?
								}
								response.schema = schema;
							}
						}
						responses[value.httpStatusCode] = response;
					}
				}
				if (!_.isEmpty(produces)) oasDef.produces = produces;
				oasDef.responses = responses;
			}
		} else {
			oasDef.responses = {
				default: {
					description: '',
					schema: {}
				}
			};
		}
		const parameters = [];
		if (model.hasOwnProperty('headers')) {
			if (_.isArray(model.headers) && !_.isEmpty(model.headers)) {
				for (const id in model.headers) {
					if (!model.headers.hasOwnProperty(id)) continue;
					
					const value = model.headers[id];
					const parameter = Object.assign({}, oas20DefinitionConverter._export(value.definition));
					parameter.in = 'header';
					parameter.name = value.definition.name; // todo: se podría definir un nuevo definition converter para parameters que exporte con name y required
					parameter.required = true; // todo: cómo se cuándo es false?
					parameters.push(parameter);
				}
			}
		}
		if (model.hasOwnProperty('bodies')) {
			if (_.isArray(model.bodies) && !_.isEmpty(model.bodies)) {
				const consumes = [];
				for (const id in model.bodies) {
					if (!model.bodies.hasOwnProperty(id)) continue;
					
					const value = model.bodies[id];
					const parameter = Object.assign({}, oas20DefinitionConverter._export(value.definition));
					parameter.in = 'body';
					parameter.name = 'body'; // todo: se podría definir un nuevo definition converter para parameters que exporte con name y required
					parameter.required = true; // todo: cómo se cuándo es false?
					parameters.push(parameter);
					consumes.push(value.mimeType);
				}
				oasDef.consumes = consumes;
			}
		}
		if (!_.isEmpty(parameters)) oasDef.parameters = parameters;
		
		return oasDef;
	}
	
	static copyObjectFrom(object, attrIdMap, attrIdSkip) {
		const result = new Method();
		
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;
			
			if (attrIdSkip.indexOf(id) < 0) {
				result[attrIdMap.hasOwnProperty(id) ? attrIdMap[id] : id] = object[id];
			}
		}
		
		return result;
	}

	import(oasDefs) {
		const validMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];
		let result = [];
		if (_.isEmpty(oasDefs)) return result;
		
		for (const id in oasDefs) {
			if (!oasDefs.hasOwnProperty(id) || !validMethods.includes(id)) continue;
			
			const oasDef = oasDefs[id];
			const method = this._import(oasDef);
			method.method = id;
			result.push(method);
		}
		
		return result;
	}

	// imports 1 method definition
	_import(oasDef) {
		const attrIdMap = {
			'operationId': 'name'
		};

		const attrIdSkip = ['responses', 'produces'];
		const model = Oas20MethodConverter.copyObjectFrom(oasDef, attrIdMap, attrIdSkip);
		const oas20DefinitionConverter = new Oas20DefinitionConverter();
		
		const produces = []
		if (oasDef.hasOwnProperty('produces')) produces.push(oasDef.produces[0]); // todo: que pasa si hay más de 1 produces
		if (oasDef.hasOwnProperty('responses')) {
			if (!_.isEmpty(oasDef.responses)) {
				const responses = [];
				for (const id in oasDef.responses) {
					if (!oasDef.responses.hasOwnProperty(id)) continue;
					
					const value = oasDef.responses[id];
					const response = new Response();
					response.httpStatusCode = id;
					if (value.hasOwnProperty('description')) response.description = value.description;
					const bodies = [];
					const body = new Body();
					body.mimeType = produces[0];
					body.definition = oas20DefinitionConverter._import(value.schema);
					bodies.push(body);
					response.bodies = bodies;
					responses.push(response);
				}
				model.responses = responses;
			}
		}
		if (oasDef.hasOwnProperty('parameters')) {
			if (_.isArray(oasDef.parameters) && !_.isEmpty(oasDef.parameters)) {
				const headers = [];
				const bodies = [];
				for (const index in oasDef.parameters) {
					if (!oasDef.parameters.hasOwnProperty(index)) continue;
					
					const val = oasDef.parameters[index];
					if (val.hasOwnProperty('in') && val.in === 'header') {
						const parameter = new Parameter();
						parameter.name = val.name;
						parameter.definition = oas20DefinitionConverter._import(val);
						headers.push(parameter);
					} else if (val.hasOwnProperty('in') && val.in === 'body') {
						const body = new Body();
						if (oasDef.hasOwnProperty('consumes') && !_.isEmpty(oasDef.consumes)) {
							body.mimeType = oasDef.consumes[0]; // todo: qué pasa si hay más de 1 consumes?
						}
						body.definition = oas20DefinitionConverter._import(val);
						bodies.push(body);
					}
				}
				model.headers = headers;
				model.bodies = bodies;
			}
		}
		
		return model;
	}
	
}

module.exports = Oas20MethodConverter;