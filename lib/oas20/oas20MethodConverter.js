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

		const attrIdSkip = ['method', 'responses', 'headers', 'bodies', 'parameters', 'is'];
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
									if (val.mimeType && !produces.includes(val.mimeType)) produces.push(val.mimeType);
									if (!val.definition.hasOwnProperty('examples')) {
										schema = oas20DefinitionConverter._export(val.definition);
										if (schema.hasOwnProperty('required')) delete schema.required;
										response.schema = schema;
									} else {
										response.examples = {};
										response.examples[val.mimeType] = val.definition.examples;
									}
								}
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
					description: ''
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
					parameter.in = value._in;
					parameter.name = value.definition.name;
					Oas20MethodConverter.exportRequired(value, parameter);
					parameters.push(parameter);
				}
			}
		}
		
		if (model.hasOwnProperty('bodies')) {
			if (_.isArray(model.bodies) && !_.isEmpty(model.bodies)) {
				const consumes = [];
				const value = model.bodies[0];
				const parameter = Object.assign({}, oas20DefinitionConverter._export(value.definition));
				parameter.in = 'body';
				parameter.name = 'body';
				if (model.bodies.length > 1) {
					parameter.schema = { type: 'object' };
					if (parameter.hasOwnProperty('$ref')) delete parameter.$ref;
					if (parameter.hasOwnProperty('type')) delete parameter.type;
				} else if (parameter.hasOwnProperty('type')) {
					parameter.schema = { type: parameter.type };
					delete parameter.type;
				}
				Oas20MethodConverter.exportRequired(value, parameter);
				parameters.push(parameter);
				if (value.mimeType) {
					consumes.push(value.mimeType);
					oasDef.consumes = consumes;
				}
			}
		}
		
		if (model.hasOwnProperty('parameters')) {
			if (_.isArray(model.parameters) && !_.isEmpty(model.parameters)) {
				for (const id in model.parameters) {
					if (!model.parameters.hasOwnProperty(id)) continue;
					
					const value = model.parameters[id];
					const parameter = Object.assign({}, oas20DefinitionConverter._export(value.definition));
					parameter.in = value._in;
					parameter.name = value.definition.name;
					Oas20MethodConverter.exportRequired(value, parameter);
					if (!parameter.hasOwnProperty('type')) parameter.type = 'string';
					if (parameter.hasOwnProperty('example')) delete parameter.example;
					parameters.push(parameter);
				}
			}
		}
		if (!_.isEmpty(parameters)) oasDef.parameters = parameters;
		
		return oasDef;
	}
	
	static exportRequired(source, target) {
		target.required = source.required;
		if (target.hasOwnProperty('required') && !target.required)
			delete target.required;
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

		const attrIdSkip = ['responses', 'produces', 'parameters'];
		const model = Oas20MethodConverter.copyObjectFrom(oasDef, attrIdMap, attrIdSkip);
		const oas20DefinitionConverter = new Oas20DefinitionConverter();
		
		const produces = [];
		if (oasDef.hasOwnProperty('produces')) produces.push(oasDef.produces[0]);
		
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
					if (value.hasOwnProperty('schema')) {
						const body = new Body();
						body.mimeType = produces[0];
						body.definition = oas20DefinitionConverter._import(value.schema);
						Oas20MethodConverter.importRequired(value, body);
						if (value.schema.hasOwnProperty('example')) Oas20MethodConverter.importExamples(value.schema, body.definition, 'example');
						bodies.push(body);
					}
					if (value.hasOwnProperty('examples') && !_.isEmpty(value.examples)) {
						const examples = value.examples;
						for (const index in examples) {
							if (!examples.hasOwnProperty(index) || examples[index] == null) continue;
							
							const val = examples[index];
							const body = new Body();
							body.mimeType = index;
							body.definition = { examples: val };
							Oas20MethodConverter.importExamples({ examples: val }, body.definition, 'examples');
							bodies.push(body);
						}
					}
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
				const parameters = [];
				for (const index in oasDef.parameters) {
					if (!oasDef.parameters.hasOwnProperty(index)) continue;
					
					const val = oasDef.parameters[index];
					if (val.hasOwnProperty('in') && val.in === 'header') {
						const parameter = new Parameter();
						parameter._in = val.in;
						parameter.name = val.name;
						parameter.definition = oas20DefinitionConverter._import(val);
						Oas20MethodConverter.importRequired(val, parameter);
						headers.push(parameter);
					} else if (val.hasOwnProperty('in') && val.in === 'body') {
						const body = new Body();
						if (oasDef.hasOwnProperty('consumes') && !_.isEmpty(oasDef.consumes)) {
							body.mimeType = oasDef.consumes[0];
						}
						body.definition = oas20DefinitionConverter._import(val);
						Oas20MethodConverter.importRequired(val, body);
						bodies.push(body);
					} else if (val.hasOwnProperty('in') && val.in === 'query') {
						const parameter = new Parameter();
						parameter._in = val.in;
						parameter.name = val.name;
						parameter.definition = oas20DefinitionConverter._import(val);
						Oas20MethodConverter.importRequired(val, parameter);
						parameters.push(parameter);
					}
				}
				model.headers = headers;
				model.bodies = bodies;
				model.parameters = parameters;
			}
		}
		
		return model;
	}
	
	static importRequired(source, target) {
		target.required = source.hasOwnProperty('required') ? source.required : false;
	}
	
	static importExamples(source, target, property) {
		try {
			const example = JSON.parse(source[property]);
			if (typeof source[property] === 'string') {
				target[property] = example;
			} else if (source[property] === null) {
				delete target[property];
			}
		} catch (e) {}
	}
	
}

module.exports = Oas20MethodConverter;