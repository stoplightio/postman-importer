const _ = require('lodash');
const Method = require('../model/method');
const Response = require('../model/response');
const Parameter = require('../model/parameter');
const Body = require('../model/body');
const Converter = require('../model/converter');
const Oas20DefinitionConverter = require('../oas20/Oas20DefinitionConverter');
const Oas20AnnotationConverter = require('../oas20/Oas20AnnotationConverter');
const SecurityRequirement = require('../model/securityRequirement');
const stringsHelper = require('../utils/strings');
const helper = require('../helpers/converter');
const oasHelper = require('../helpers/oas20');

class Oas20MethodConverter extends Converter {
	
	constructor(model, parentResource) {
		super(model);
		this.parentResource = parentResource;
	}
	
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
		const attrIdSkip = ['method', 'responses', 'headers', 'bodies', 'formBodies', 'parameters', 'is', 'path', 'produces', 'consumes', 'securedBy', 'annotations'];
		const oasDef = Oas20MethodConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);
		const definitionConverter = new Oas20DefinitionConverter();
		const traitModels = helper.getTraitModel(this.model, this.parentResource, model.method);
		const inheritedResponses = helper.getInheritedResponses(null, traitModels);
		const inheritedHeaders = helper.getInheritedHeaders(traitModels);
		const inheritedParams = helper.getInheritedParams(traitModels);
		
		if (!oasDef.hasOwnProperty('operationId')) oasDef.operationId = stringsHelper.computeOperationId(model.method, model.path);
		
		if (model.hasOwnProperty('responses')) {
			if (_.isArray(model.responses) && !_.isEmpty(model.responses)) {
				const responses = {};
				let produces = [];
				if (model.hasOwnProperty('produces')) produces = model.produces;

				for (const id in model.responses) {
					if (!model.responses.hasOwnProperty(id)) continue;
					
					const value = model.responses[id];
					if (value.hasOwnProperty('httpStatusCode')) {
						const response = {};
						let names = [];
						if (traitModels) names = traitModels.map(traitModel => {
							return traitModel.name + ':' + value.httpStatusCode;
						});
						const inheritedResponse = _.intersection(inheritedResponses, names);
						if (!_.isEmpty(inheritedResponse)) {
							response['$ref'] = '#/responses/trait:' + inheritedResponse[0];
						} else if (value.hasOwnProperty('reference')) {
							response['$ref'] = value.reference;
						} else {
							response.description = value.hasOwnProperty('description') ? value.description : '';
							if (value.hasOwnProperty('bodies')) {
								if (_.isArray(value.bodies) && !_.isEmpty(value.bodies)) {
									let schema = {};
									for (const index in value.bodies) {
										if (!value.bodies.hasOwnProperty(index)) continue;
										
										const val = value.bodies[index];
										if (val.mimeType && !produces.includes(val.mimeType)) produces.push(val.mimeType);
										if (!val.definition.hasOwnProperty('examples')) {
											schema = definitionConverter._export(val.definition);
											if (schema.hasOwnProperty('required') && schema.required === true) delete schema.required;
											if (schema.hasOwnProperty('$ref')) schema = { $ref: schema.$ref };
											response.schema = schema;
										} else {
											response.examples = {};
											response.examples[val.mimeType] = val.definition.examples;
										}
									}
								}
							}
						}
						responses[value.httpStatusCode] = response;
					}
				}
				if (!_.isEmpty(produces)) {
					oasDef.produces = produces;
				}
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
					let parameter;
					let names = [];
					if (traitModels) names = traitModels.map(traitModel => {
							return traitModel.name + ':' + value.name;
					});
					const inheritedHeader = _.intersection(inheritedHeaders, names);
					if (!_.isEmpty(inheritedHeader)) {
						parameter = { $ref: '#/parameters/trait:' + inheritedHeader[0] };
					} else {
						parameter = Object.assign({}, definitionConverter._export(value.definition));
						parameter.in = value._in;
						parameter.name = value.definition.name;
						if (!parameter.type && !parameter.$ref) parameter.type = 'string';
						if (parameter.hasOwnProperty('example')) delete parameter.example;
						Oas20MethodConverter.exportRequired(value, parameter);
						if (value.hasOwnProperty('annotations') && !_.isEmpty(value.annotations)) {
							const annotationConverter = new Oas20AnnotationConverter();
							_.assign(parameter, annotationConverter._export(value));
						}
					}
					parameters.push(parameter);
				}
			}
		}
		
		let consumes = [];
		if (model.hasOwnProperty('consumes')) consumes = model.consumes;
		if (model.hasOwnProperty('bodies')) {
			if (_.isArray(model.bodies) && !_.isEmpty(model.bodies)) {
				const value = model.bodies[0];
				const parameter = {};
				parameter.schema = Object.assign({}, definitionConverter._export(value.definition));
				parameter.in = 'body';
				parameter.name = 'body';
				if (model.bodies.length > 1) {
					parameter.schema.type = 'object';
					delete parameter.schema.$ref;
				}
				if (parameter.schema.hasOwnProperty('$ref')) parameter.schema = { $ref: parameter.schema.$ref };
				if (!parameter.schema.type && !parameter.schema.$ref) parameter.schema.type = 'string';
				Oas20MethodConverter.exportRequired(value, parameter);
				if (value.hasOwnProperty('annotations') && !_.isEmpty(value.annotations)) {
					const annotationConverter = new Oas20AnnotationConverter();
					_.assign(parameter, annotationConverter._export(value));
				}
				parameters.push(parameter);

				for (const id in model.bodies) {
					if (!model.bodies.hasOwnProperty(id)) continue;

					const body = model.bodies[id];
					if (body.mimeType && !consumes.includes(body.mimeType)) consumes.push(body.mimeType);
				}
			}
		}
		
		if (model.hasOwnProperty('formBodies')) {
			if (_.isArray(model.formBodies) && !_.isEmpty(model.formBodies)) {
				for (const id in model.formBodies) {
					if (!model.formBodies.hasOwnProperty(id)) continue;
					
					const body = model.formBodies[id];
					if (body.mimeType && !consumes.includes(body.mimeType)) consumes.push(body.mimeType);
					const parameter = {};
					parameter.in = 'formData';
					parameter.name = body.definition.name;
					parameter.type = body.definition.internalType ? body.definition.internalType : body.definition.type;
					if (body.hasOwnProperty('description')) parameter.description = body.description;
					Oas20MethodConverter.exportRequired(body, parameter);
					if (body.hasOwnProperty('annotations') && !_.isEmpty(body.annotations)) {
						const annotationConverter = new Oas20AnnotationConverter();
						_.assign(parameter, annotationConverter._export(body));
					}
					parameters.push(parameter);
				}
				if (_.isEmpty(_.intersection(consumes, helper.getValidFormDataMimeTypes))) consumes.push('multipart/form-data');
			}
		}
		if (!_.isEmpty(consumes)) oasDef.consumes = consumes;
		
		if (model.hasOwnProperty('parameters')) {
			if (_.isArray(model.parameters) && !_.isEmpty(model.parameters)) {
				for (const id in model.parameters) {
					if (!model.parameters.hasOwnProperty(id)) continue;
					
					const value = model.parameters[id];
					let parameter;
					let names = [];
					if (traitModels) names = traitModels.map(traitModel => {
						return traitModel.name + ':' + value.name;
					});
					const inheritedParam = _.intersection(inheritedParams, names);
					if (!_.isEmpty(inheritedParam)) {
						parameter = { $ref: '#/parameters/trait:' + inheritedParam[0] };
					} else if (value.hasOwnProperty('reference')) {
						parameter = { $ref: value.reference };
					} else {
						parameter = Object.assign({}, definitionConverter._export(value.definition));
						parameter.in = value._in;
						parameter.name = value.definition.name;
						Oas20MethodConverter.exportRequired(value, parameter);
						if (!parameter.hasOwnProperty('type')) parameter.type = 'string';
						if (parameter.hasOwnProperty('example')) delete parameter.example;
						if (value.hasOwnProperty('annotations') && !_.isEmpty(value.annotations)) {
							const annotationConverter = new Oas20AnnotationConverter();
							_.assign(parameter, annotationConverter._export(value));
						}
					}
					parameters.push(parameter);
				}
			}
		}
		if (!_.isEmpty(parameters)) oasDef.parameters = parameters;

		if (model.hasOwnProperty('securedBy')) {
			const security = [];
			for (const key in model.securedBy) {
				if (!model.securedBy.hasOwnProperty(key)) continue;

				const securityReq = model.securedBy[key];
				security.push({ [securityReq.name] : securityReq.scopes });
			}
			if (!_.isEmpty(security)){
				oasDef['security'] = security;
			}
		}
		
		if (model.hasOwnProperty('annotations')) {
			if (_.isArray(model.annotations) && !_.isEmpty(model.annotations)) {
				const annotationConverter = new Oas20AnnotationConverter();
				_.assign(oasDef, annotationConverter._export(model));
			}
		}
		
		return oasDef;
	}
	
	static exportRequired(source, target) {
		target.required = source.required;
		if (target.hasOwnProperty('required') && !target.required)
			delete target.required;
	}
	
	static copyObjectFrom(object, attrIdMap, attrIdSkip, annotationPrefix) {
		const result = new Method();
		
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;
			
			if (attrIdSkip.indexOf(id) < 0 && !id.startsWith(annotationPrefix) && !id.startsWith('x-')) {
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

		const attrIdSkip = ['responses', 'produces', 'parameters', 'consumes', 'security'];
		const annotationPrefix = oasHelper.getAnnotationPrefix;
		const model = Oas20MethodConverter.copyObjectFrom(oasDef, attrIdMap, attrIdSkip, annotationPrefix);
		const definitionConverter = new Oas20DefinitionConverter();
		
		let produces = [];
		if (oasDef.hasOwnProperty('produces')) {
			model.produces = oasDef.produces;
			produces = model.produces;
		}

		let consumes = [];
		if (oasDef.hasOwnProperty('consumes')) {
			model.consumes = oasDef.consumes;
			consumes = model.consumes;
		}

		if (oasDef.hasOwnProperty('security')) {
			const result = [];
			oasDef.security.map(security => {
				const securityReq = new SecurityRequirement();
				securityReq.name = Object.keys(security)[0];
				securityReq.scopes = security[securityReq.name];
				result.push(securityReq);
			});
			if (!_.isEmpty(result)) {
				model.securedBy = result;
			}
		}

		if (oasDef.hasOwnProperty('responses')) {
			if (!_.isEmpty(oasDef.responses)) {
				const responses = [];
				for (const id in oasDef.responses) {
					if (!oasDef.responses.hasOwnProperty(id)) continue;
					
					const value = oasDef.responses[id];
					const response = new Response();
					response.httpStatusCode = id;
					if (value.hasOwnProperty('$ref')) response.reference = value.$ref;
					else {
						if (value.hasOwnProperty('description')) response.description = value.description;
						const bodies = [];
						if (value.hasOwnProperty('schema')) {
							const body = new Body();
							body.mimeType = produces[0];
							body.definition = definitionConverter._import(value.schema);
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
					}
					responses.push(response);
				}
				model.responses = responses;
			}
		}
		
		if (oasDef.hasOwnProperty('parameters')) {
			if (_.isArray(oasDef.parameters) && !_.isEmpty(oasDef.parameters)) {
				const headers = [];
				const bodies = [];
				const formBodies = [];
				const parameters = [];
				for (const index in oasDef.parameters) {
					if (!oasDef.parameters.hasOwnProperty(index)) continue;
					
					const val = oasDef.parameters[index];
					if (val.hasOwnProperty('$ref')) {
						const parameter = new Parameter();
						parameter.reference = val.$ref;
						parameters.push(parameter);
					} else if (val.hasOwnProperty('in') && val.in === 'header') {
						const parameter = new Parameter();
						parameter._in = val.in;
						parameter.name = val.name;
						if (parameter.hasOwnProperty('description')) parameter.description = val.description;
						const annotationConverter = new Oas20AnnotationConverter(this.model);
						const annotations = annotationConverter._import(val);
						if (!_.isEmpty(annotations)) parameter.annotations = annotations;
						parameter.definition = definitionConverter._import(val);
						Oas20MethodConverter.importRequired(val, parameter);
						headers.push(parameter);
					} else if (val.hasOwnProperty('in') && val.in === 'body') {
						const body = new Body();
						if (!_.isEmpty(consumes)) body.mimeType = consumes[0];
						if (val.hasOwnProperty('description')) body.description = val.description;
						const annotationConverter = new Oas20AnnotationConverter(this.model);
						const annotations = annotationConverter._import(val);
						if (!_.isEmpty(annotations)) body.annotations = annotations;
						body.definition = definitionConverter._import(val.schema);
						Oas20MethodConverter.importRequired(val, body);
						bodies.push(body);
					} else if (val.hasOwnProperty('in') && val.in === 'formData') {
						const body = new Body();
						body.definition = {
							type: val.type,
							name: val.name
						};
						if (!_.isEmpty(consumes)) body.mimeType = consumes[0];
						if (val.hasOwnProperty('description')) body.description = val.description;
						const annotationConverter = new Oas20AnnotationConverter(this.model);
						const annotations = annotationConverter._import(val);
						if (!_.isEmpty(annotations)) body.annotations = annotations;
						Oas20MethodConverter.importRequired(val, body);
						formBodies.push(body);
					} else if (val.hasOwnProperty('in') && val.in === 'query') {
						const parameter = new Parameter();
						parameter._in = val.in;
						parameter.name = val.name;
						if (parameter.hasOwnProperty('description')) parameter.description = val.description;
						const annotationConverter = new Oas20AnnotationConverter(this.model);
						const annotations = annotationConverter._import(val);
						if (!_.isEmpty(annotations)) parameter.annotations = annotations;
						parameter.definition = definitionConverter._import(val);
						Oas20MethodConverter.importRequired(val, parameter);
						parameters.push(parameter);
					}
				}
				model.headers = headers;
				model.bodies = bodies;
				model.formBodies = formBodies;
				model.parameters = parameters;
			}
		}
		
		const annotationConverter = new Oas20AnnotationConverter(this.model);
		const annotations = annotationConverter._import(oasDef);
		if (!_.isEmpty(annotations)) model.annotations = annotations;
		
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