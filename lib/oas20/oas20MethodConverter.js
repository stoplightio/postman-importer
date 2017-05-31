const _ = require('lodash');
const Method = require('../model/method');
const Response = require('../model/response');
const Parameter = require('../model/parameter');
const Body = require('../model/body');
const Converter = require('../model/converter');
const Oas20RootConverter = require('../oas20/Oas20RootConverter');
const Oas20DefinitionConverter = require('../oas20/Oas20DefinitionConverter');
const Oas20AnnotationConverter = require('../oas20/Oas20AnnotationConverter');
const ParameterConverter = require('../common/ParameterConverter');
const SecurityRequirement = require('../model/securityRequirement');
const ExternalDocumentation = require('../model/externalDocumentation');
const helper = require('../helpers/converter');
const stringsHelper = require('../utils/strings');
const oasHelper = require('../helpers/oas20');

class Oas20MethodConverter extends Converter {
	
	constructor(model, dereferencedAPI, resourcePath) {
		super(model);
		this.dereferencedAPI = dereferencedAPI;
		this.resourcePath = resourcePath;
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
			'protocols': 'schemes',
			'name': 'operationId'
		};
		const attrIdSkip = ['method', 'responses', 'headers', 'bodies', 'formBodies', 'parameters', 'queryStrings', 'is', 'path', 'produces', 'consumes', 'securedBy', 'annotations'];
		const oasDef = Oas20MethodConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);
		const definitionConverter = new Oas20DefinitionConverter();
		
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
						if (value.hasOwnProperty('reference')) {
							response['$ref'] = value.reference;
							if (value.bodies && !_.isEmpty(value.bodies)) {
								const mimeType = value.bodies[0].mimeType;
								if (!produces.includes(mimeType)) produces.push(mimeType);
							}
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
										if (val.definition.hasOwnProperty('examples')) {
											response.examples = {};
											response.examples[val.mimeType] = val.definition.examples;
											delete val.definition.examples;
										}
										schema = definitionConverter._export(val.definition);
										if (schema.hasOwnProperty('required') && schema.required === true) delete schema.required;
										if (schema.hasOwnProperty('$ref')) schema = {$ref: schema.$ref};
										Oas20RootConverter.exportAnnotations(val, schema);
										if (!_.isEmpty(schema)) response.schema = schema;
									}
								}
							}
						}
						Oas20RootConverter.exportAnnotations(value, response);
						if (value.hasOwnProperty('hasParams')) response.hasParams = value.hasParams;
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
		
		let parameters = Oas20MethodConverter.exportHeaders(model, definitionConverter);
		
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
				if (model.bodies.length > 1) parameter.schema = {type: 'object'};
				if (parameter.schema.hasOwnProperty('$ref')) parameter.schema = {$ref: parameter.schema.$ref};
				if (!parameter.schema.type && !parameter.schema.$ref) parameter.schema.type = 'string';
				Oas20MethodConverter.exportRequired(value, parameter);
				Oas20RootConverter.exportAnnotations(value, parameter);
				if (value.hasOwnProperty('hasParams')) parameter.hasParams = value.hasParams;
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
		
		const queryParameters = Oas20MethodConverter.exportParameters(model, 'parameters', definitionConverter);
		if (!_.isEmpty(queryParameters)) parameters = parameters.concat(queryParameters);
		
		const queryStrings = Oas20MethodConverter.exportParameters(model, 'queryStrings', definitionConverter);
		if (!_.isEmpty(queryStrings)) parameters = parameters.concat(queryStrings);
		
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

	static exportHeaders(object, converter) {
		const headers = [];
		
		if (object.hasOwnProperty('headers')) {
			if (_.isArray(object.headers) && !_.isEmpty(object.headers)) {
				for (const id in object.headers) {
					if (!object.headers.hasOwnProperty(id)) continue;
					
					const value = object.headers[id];
					let header;
					if (value.hasOwnProperty('reference')) {
						header = { $ref: value.reference };
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
	
	static exportParameters(object, paramsType, converter) {
		let parameters = [];
		if (object.hasOwnProperty(paramsType)) {
			if (_.isArray(object[paramsType]) && !_.isEmpty(object[paramsType])) {
				for (const id in object[paramsType]) {
					if (!object[paramsType].hasOwnProperty(id)) continue;
					
					const value = object[paramsType][id];
					let parameter;
					if (value.hasOwnProperty('reference')) {
						parameter = { $ref: value.reference };
					} else if (paramsType === 'queryStrings' && value.definition.hasOwnProperty('properties')) {
						const queryStrings = Oas20MethodConverter.exportMultipleQueryStrings(value, converter);
						if (!_.isEmpty(queryStrings)) parameters = parameters.concat(queryStrings);
					} else {
						parameter = Object.assign({}, converter._export(value.definition));
						parameter.in = value._in;
						parameter.name = value.definition.name;
						Oas20MethodConverter.exportRequired(value, parameter);
						if (!parameter.type) parameter.type = 'string';
						if (parameter.$ref) delete parameter.$ref;
						helper.removePropertiesFromObject(parameter, ['example']);
						Oas20RootConverter.exportAnnotations(value, parameter);
						if (value.hasOwnProperty('hasParams')) parameter.hasParams = value.hasParams;
					}
					if (parameter) parameters.push(parameter);
				}
			}
		}
		
		return parameters;
	}
	
	static exportMultipleQueryStrings(object, converter) {
		const definition = object.definition;
		const queryStrings = [];
		for (const id in definition.properties) {
			if (!definition.properties.hasOwnProperty(id)) continue;
			
			const value = definition.properties[id];
			const parameter = converter._export(value);
			parameter.in = object._in;
			parameter.name = id;
			Oas20MethodConverter.exportRequired(object, parameter);
			queryStrings.push(parameter)
		}
		
		return queryStrings;
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
		
		const parameters = [];
		if (oasDefs.hasOwnProperty('parameters')) {
			for (const id in oasDefs.parameters) {
				if (!oasDefs.parameters.hasOwnProperty(id)) continue;
				
				const parameter = (oasHelper.isFilePath(oasDefs.parameters[id]) && this.dereferencedAPI) ? this.dereferencedAPI.parameters[id] : oasDefs.parameters[id];
				if (parameter.in === 'header') parameters.push(parameter);
			}
		}
		
		for (const id in oasDefs) {
			if (!oasDefs.hasOwnProperty(id) || !validMethods.includes(id)) continue;
			
			const oasDef = oasDefs[id].hasOwnProperty('$ref') ? this.dereferencedAPI[id]: oasDefs[id];
			this.currentMethod = id;
			const parametersDef = oasDef.parameters ? oasDef.parameters.concat(parameters) : parameters;
			if (!_.isEmpty(parametersDef)) oasDef.parameters = parametersDef;
			this.method = id;
			const method = this._import(oasDef);
			method.method = id;
			result.push(method);
		}
		
		return result;
	}

	// imports 1 method definition
	_import(oasDef) {
		const attrIdMap = {
			'operationId': 'name',
			'schemes': 'protocols'
		};

		const attrIdSkip = ['responses', 'description', 'produces', 'parameters', 'consumes', 'security', 'externalDocs'];
		const model = Oas20MethodConverter.copyObjectFrom(oasDef, attrIdMap, attrIdSkip, oasHelper.getAnnotationPrefix);
		const definitionConverter = new Oas20DefinitionConverter(this.model);
		
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

		if (oasDef.hasOwnProperty('description') && !_.isEmpty(oasDef.description)) {
			model.description = oasDef.description;
		}

		if (oasDef.hasOwnProperty('responses')) {
			if (!_.isEmpty(oasDef.responses)) {
				const responses = [];
				for (const id in oasDef.responses) {
					if (!oasDef.responses.hasOwnProperty(id)) continue;
					
					const value = oasDef.responses[id];
					const response = new Response();
					response.httpStatusCode = id;
					if (value.hasOwnProperty('$ref')) {
						const reference = stringsHelper.computeResourceDisplayName(value.$ref);
						const modelResponses = this.model.responses.filter(modelResponse => { return modelResponse.name === reference });
						const def = modelResponses[0];
						if (def.hasOwnProperty('description')) response.description = def.description;
						if (def.hasOwnProperty('headers')) response.headers = def.headers;
						if (def.hasOwnProperty('bodies')) response.bodies = def.bodies;
						response['global-response-definition'] = reference;
					}  else {
						if (value.hasOwnProperty('description')) response.description = value.description; 
						if (value.hasOwnProperty('headers')) { 
							const headers = []; 
							const definitionConverter = new Oas20DefinitionConverter(); 
							for (const index in value.headers) { 
								const header = new Parameter(); 
								header.name = index; 
								header.definition = definitionConverter._import(value.headers[index]); 
								headers.push(header); 
							} 
							response.headers = headers; 
						}

						const body = new Body();
						if (value.hasOwnProperty('schema')) {
							const annotationConverter = new Oas20AnnotationConverter(this.model);
							const annotations = annotationConverter._import(value.schema);
							body.definition = definitionConverter._import(value.schema);
							if (!_.isEmpty(annotations)) body.definition.annotations = annotations;
							if (value.schema.hasOwnProperty('example')) Oas20MethodConverter.importExamples(value.schema, body.definition, 'example');
						}
						if (value.hasOwnProperty('examples') && !_.isEmpty(value.examples)) {
							const examples = value.examples;
							for (const index in examples) {
								if (!examples.hasOwnProperty(index) || examples[index] == null) continue;
								if (!body.mimeType) body.mimeType = index;
								const val = examples[index];
								const result = new Body();
								result.definition = { examples: val };
								Oas20MethodConverter.importExamples({ examples: val }, result.definition, 'examples');
								_.merge(body,result);
							}
						}
						response.bodies = _.isEmpty(body) ? [] : [body];
					}
					Oas20RootConverter.importAnnotations(value, response, this.model);
					responses.push(response);
				}
				model.responses = responses;
			}
		}

		if (oasDef.hasOwnProperty('externalDocs')) {
      const defExternalDocs = oasDef.externalDocs;
      const externalDocs = new ExternalDocumentation();
      if (defExternalDocs.hasOwnProperty('url')) externalDocs.url = defExternalDocs.url;
      if (defExternalDocs.hasOwnProperty('description')) externalDocs.description = defExternalDocs.description;
      if (!_.isEmpty(externalDocs)) {
        model.externalDocs = externalDocs;
      }
		}
		if (oasDef.hasOwnProperty('parameters')) {
			if (_.isArray(oasDef.parameters) && !_.isEmpty(oasDef.parameters)) {
				const headers = [];
				const bodies = [];
				const formBodies = [];
				const parameters = [];
				const is = [];
				for (const index in oasDef.parameters) {
					if (!oasDef.parameters.hasOwnProperty(index)) continue;
					
					const isExternal = oasHelper.isFilePath(oasDef.parameters[index]);
					let dereferencedParam = (this.dereferencedAPI) ? (this.currentMethod ? (this.dereferencedAPI[this.currentMethod].parameters ? this.dereferencedAPI[this.currentMethod].parameters[index] : null): this.dereferencedAPI) : null;
					const isInPath = this.resourcePath && dereferencedParam && dereferencedParam.in === 'path';
					const val = (isExternal || isInPath) && dereferencedParam ? dereferencedParam : oasDef.parameters[index];
					if (val.hasOwnProperty('$ref') && !isInPath) {
						const regex = /(trait:)(.*)(:.*)/;
						let traitName = stringsHelper.computeResourceDisplayName(val.$ref)
						const match = traitName.match(regex);
						if (match) traitName = match[2];
						if (!is.map(object => { return object.name }).includes(traitName)) is.push({ name: traitName });
						const parameter = new Parameter();
						parameter.reference = val.$ref;
						parameters.push(parameter);
					} else {
						if (val.hasOwnProperty('exclusiveMaximum')) {
							val['x-oas-exclusiveMaximum'] = val.exclusiveMaximum;
							delete val.exclusiveMaximum;
						}
						if (val.hasOwnProperty('exclusiveMinimum')) {
							val['x-oas-exclusiveMinimum'] = val.exclusiveMinimum;
							delete val.exclusiveMinimum;
						}
						if (val.hasOwnProperty('in') && val.in === 'header') {
							const parameter = new Parameter();
							parameter._in = val.in;
							parameter.name = val.name;
							if (val.hasOwnProperty('description')) parameter.description = val.description;
							Oas20RootConverter.importAnnotations(val, parameter, this.model);
							parameter.definition = definitionConverter._import(val);
							Oas20MethodConverter.importRequired(val, parameter);
							headers.push(parameter);
						} else if (val.hasOwnProperty('in') && val.in === 'body') {
							const body = new Body();
							if (val.hasOwnProperty('description')) body.description = val.description;
							if (val.hasOwnProperty('name')) body.name = val.name;
							Oas20RootConverter.importAnnotations(val, body, this.model);
							body.definition = definitionConverter._import(val.schema);
							Oas20MethodConverter.importRequired(val, body);
							bodies.push(body);
						} else if (val.hasOwnProperty('in') && val.in === 'formData') {
							const body = new Body();
							body.definition = definitionConverter._import(val);
							if (val.hasOwnProperty('description')) body.description = val.description;
							Oas20RootConverter.importAnnotations(val, body, this.model);
							Oas20MethodConverter.importRequired(val, body);
							formBodies.push(body);
						} else if (val.hasOwnProperty('in') && (val.in === 'query' || val.in === 'path')) {
							const parameter = new Parameter();
							parameter._in = val.in;
							parameter.name = val.name;
							if (parameter.hasOwnProperty('description')) parameter.description = val.description;
							Oas20RootConverter.importAnnotations(val, parameter, this.model);
							parameter.definition = definitionConverter._import(val);
							Oas20MethodConverter.importRequired(val, parameter);
							if (val.in === 'path' && this.model[this.resourcePath] && this.resourcePath.split("/").pop().includes(dereferencedParam.name)) {
								if (this.model[this.resourcePath].parameters) {
									this.model[this.resourcePath].parameters.push(parameter);
								} else {
									this.model[this.resourcePath].parameters = [parameter];
								}
							} else {
								parameters.push(parameter);
							}
						}
					}
				}
				model.headers = headers;
				model.bodies = bodies;
				model.formBodies = formBodies;
				model.parameters = parameters;
				if (!_.isEmpty(is)) model.is = is;
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