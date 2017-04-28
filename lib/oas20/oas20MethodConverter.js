const _ = require('lodash');
const Method = require('../model/method');
const Response = require('../model/response');
const Parameter = require('../model/parameter');
const Body = require('../model/body');
const AnnotationType = require('../model/annotationType');
const Converter = require('../model/converter');
const Oas20RootConverter = require('../oas20/Oas20RootConverter');
const Oas20DefinitionConverter = require('../oas20/Oas20DefinitionConverter');
const Oas20AnnotationConverter = require('../oas20/Oas20AnnotationConverter');
const ParameterConverter = require('../common/ParameterConverter');
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
		const resourceTypeModel = helper.getResourceTypeModel(this.model, this.parentResource);
		const traitModels = helper.getTraitModel(this.model, this.parentResource, model.method);
		const inheritedResponses = helper.getInheritedResponses(this.model, resourceTypeModel, traitModels);
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
							if (value.bodies && !_.isEmpty(value.bodies)) {
								const mimeType = value.bodies[0].mimeType;
								if (!produces.includes(mimeType)) produces.push(mimeType);
							}
						} else if (value.hasOwnProperty('reference')) {
							response['$ref'] = value.reference;
						} else {
							response.description = value.hasOwnProperty('description') ? value.description : '';
							if (value.hasOwnProperty('headers')) {
								if (_.isArray(value.headers) && !_.isEmpty(value.headers)) {
									const parameterConverter = new ParameterConverter(this.model);
									const headers = parameterConverter.export(value.headers);
									if (!_.isEmpty(headers)) response.headers = headers;
								}
							}
							if (value.hasOwnProperty('bodies')) {
								if (_.isArray(value.bodies) && !_.isEmpty(value.bodies)) {
									let schema = {};
									for (const index in value.bodies) {
										if (!value.bodies.hasOwnProperty(index)) continue;
										
										const val = value.bodies[index];
										if (val.mimeType && !produces.includes(val.mimeType)) produces.push(val.mimeType);
										response.description = val.hasOwnProperty('description') && _.isEmpty(response.description) ? val.description : response.description;
										if (!val.definition.hasOwnProperty('examples')) {
											schema = definitionConverter._export(val.definition);
											if (schema.hasOwnProperty('required') && schema.required === true) delete schema.required;
											if (schema.hasOwnProperty('$ref')) schema = { $ref: schema.$ref };
											Oas20RootConverter.exportAnnotations(val, schema);
											if (!_.isEmpty(schema)) response.schema = schema;
										} else {
											response.examples = {};
											response.examples[val.mimeType] = val.definition.examples;
										}
									}
								}
							}
						}
						Oas20RootConverter.exportAnnotations(value, response);
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
		
		const parameters = Oas20MethodConverter.exportHeaders(model, definitionConverter, traitModels, inheritedHeaders);
		
		let consumes = [];
		if (model.hasOwnProperty('consumes')) consumes = model.consumes;
		if (model.hasOwnProperty('bodies')) {
			if (_.isArray(model.bodies) && !_.isEmpty(model.bodies)) {
				const value = model.bodies[0];
				const parameter = {};
				parameter.schema = Object.assign({}, definitionConverter._export(value.definition));
				parameter.in = 'body';
				parameter.name = 'body';
				if (value.hasOwnProperty('description')) parameter.description = value.description;
				if (model.bodies.length > 1) parameter.schema = { type: 'object' };
				if (parameter.schema.hasOwnProperty('$ref')) parameter.schema = { $ref: parameter.schema.$ref };
				if (!parameter.schema.type && !parameter.schema.$ref) parameter.schema.type = 'string';
				Oas20MethodConverter.exportRequired(value, parameter);
				Oas20RootConverter.exportAnnotations(value, parameter);
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
					if (!parameter.type) parameter.type = 'string';
					if (body.hasOwnProperty('description')) parameter.description = body.description;
					Oas20MethodConverter.exportRequired(body, parameter);
					Oas20RootConverter.exportAnnotations(body, parameter);
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
						if (!parameter.type) parameter.type = 'string';
						if (parameter.$ref) delete parameter.$ref;
						helper.removePropertiesFromObject(parameter, ['example']);
						Oas20RootConverter.exportAnnotations(value, parameter);
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
		
		Oas20RootConverter.exportAnnotations(model, oasDef);
		
		return oasDef;
	}
	
	static exportRequired(source, target) {
		target.required = source.required;
		if (target.hasOwnProperty('required') && !target.required)
			delete target.required;
	}

	static exportHeaders(object, converter, traitModels, inheritedHeaders) {
		const headers = [];
		
		if (object.hasOwnProperty('headers')) {
			if (_.isArray(object.headers) && !_.isEmpty(object.headers)) {
				for (const id in object.headers) {
					if (!object.headers.hasOwnProperty(id)) continue;
					
					const value = object.headers[id];
					let header;
					let names = [];
					if (traitModels) names = traitModels.map(traitModel => {
							return traitModel.name + ':' + value.name;
					});
					const inheritedHeader = _.intersection(inheritedHeaders, names);
					if (!_.isEmpty(inheritedHeader)) {
						header = { $ref: '#/parameters/trait:' + inheritedHeader[0] };
					} else {
						header = Object.assign({}, converter._export(value.definition));
						header.in = value._in;
						header.name = value.definition.name;
						if (!header.type) header.type = 'string';
						if (header.$ref) delete header.$ref;
						helper.removePropertiesFromObject(header, ['example']);
						Oas20MethodConverter.exportRequired(value, header);
						Oas20RootConverter.exportAnnotations(value, header);
					}
					headers.push(header);
				}
			}
		}

		return headers;
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

		const attrIdSkip = ['responses', 'produces', 'parameters', 'consumes', 'security', 'tags'];
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
							const annotationConverter = new Oas20AnnotationConverter(this.model);
							const annotations = annotationConverter._import(value.schema);
							body.definition = definitionConverter._import(value.schema);
							if (!_.isEmpty(annotations)) body.definition.annotations = annotations;
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
					Oas20RootConverter.importAnnotations(value, response, this.model);
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
						Oas20RootConverter.importAnnotations(val, parameter, this.model);
						parameter.definition = definitionConverter._import(val);
						Oas20MethodConverter.importRequired(val, parameter);
						headers.push(parameter);
					} else if (val.hasOwnProperty('in') && val.in === 'body') {
						const body = new Body();
						if (!_.isEmpty(consumes)) body.mimeType = consumes[0];
						if (val.hasOwnProperty('description')) body.description = val.description;
						Oas20RootConverter.importAnnotations(val, body, this.model);
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
						Oas20RootConverter.importAnnotations(val, body, this.model);
						Oas20MethodConverter.importRequired(val, body);
						formBodies.push(body);
					} else if (val.hasOwnProperty('in') && val.in === 'query') {
						const parameter = new Parameter();
						parameter._in = val.in;
						parameter.name = val.name;
						if (parameter.hasOwnProperty('description')) parameter.description = val.description;
						Oas20RootConverter.importAnnotations(val, parameter, this.model);
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

		if (oasDef.hasOwnProperty('tags')) {
			model.tags = oasDef.tags;

			const annotationTypes = this.model.annotationTypes ? this.model.annotationTypes : [];
			const annotationTypeNames = [];
			annotationTypes.map(annotationType => annotationTypeNames.push(annotationType.name));
			if (!_.includes(annotationTypeNames, 'oas-tags')) {
				const tagAnnotation = new AnnotationType();
				tagAnnotation.name = 'oas-tags';
				tagAnnotation.allowedTargets = 'Method';
				const items = { type: 'string' };
				tagAnnotation.definition = {
					type: 'array',
					items: items
				};
				annotationTypes.push(tagAnnotation);
				this.model.annotationTypes = annotationTypes;
			}
		}
		
		Oas20RootConverter.importAnnotations(oasDef, model, this.model);
		
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