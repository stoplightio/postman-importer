const _ = require('lodash');
const Method = require('../model/method');
const Response = require('../model/response');
const Body = require('../model/body');
const Converter = require('../model/converter');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');
const Raml10ParameterConverter = require('../raml10/Raml10ParameterConverter');
const Raml10AnnotationConverter = require('../raml10/Raml10AnnotationConverter');
const SecurityRequirement = require('../model/securityRequirement');
const helper = require('../helpers/converter');

class Raml10MethodConverter extends Converter {
	
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
			'name': 'displayName'
		};

		const attrIdSkip = ['responses', 'headers', 'bodies', 'formBodies', 'method', 'parameters', 'consumes', 'usage', 'path', 'produces', 'securedBy', 'annotations'];
		const ramlDef = Raml10MethodConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);
		const definitionConverter = new Raml10DefinitionConverter();
		const resourceTypeModel = helper.getResourceTypeModel(this.model, this.parentResource);
		const traitModels = helper.getTraitModel(this.model, this.parentResource, model.method);
		const inheritedResponses = helper.getInheritedResponses(resourceTypeModel, traitModels);
		const inheritedBodies = helper.getInheritedBodies(traitModels);
		const inheritedHeaders = helper.getInheritedHeaders(traitModels);
		const inheritedParams = helper.getInheritedParams(traitModels);
		
		if (model.hasOwnProperty('is') && _.isArray(model.is) && model.is.length == 1) ramlDef.is = model.is[0];
		
		if (model.hasOwnProperty('responses')) {
			if (_.isArray(model.responses) && !_.isEmpty(model.responses)) {
				const responses = {};
				for (const index in model.responses) {
					if (!model.responses.hasOwnProperty(index)) continue;
					
					const val = model.responses[index];
					let names = [];
					if (traitModels) names = traitModels.map(traitModel => {
						return traitModel.name + ':' + val.httpStatusCode;
					});
					const inheritedResponse = _.intersection(inheritedResponses, names);
					if (val.hasOwnProperty('httpStatusCode') && val.httpStatusCode != 'default' &&
							!inheritedResponses.includes(helper.getResponseName(model.method, val.httpStatusCode)) &&
							_.isEmpty(inheritedResponse) && !val.hasOwnProperty('reference')) {
						const response = {};
						if (val.hasOwnProperty('description')) response.description = val.description;
						const body = Raml10MethodConverter.exportBodies(val, definitionConverter, [], []);
						if (!_.isEmpty(body)) response.body = body;
						if (val.hasOwnProperty('annotations')) {
							if (_.isArray(val.annotations) && !_.isEmpty(val.annotations)) {
								const annotationConverter = new Raml10AnnotationConverter();
								_.assign(response, annotationConverter._export(val));
							}
						}
						responses[val.httpStatusCode] = response;
					}
				}
				if (!_.isEmpty(responses)) ramlDef.responses = responses;
			}
		}
		
		if (model.hasOwnProperty('headers')) {
			if (_.isArray(model.headers) && !_.isEmpty(model.headers)) {
				const parameterConverter = new Raml10ParameterConverter(this.model, this.parentResource, traitModels, inheritedHeaders);
				const headers = parameterConverter.export(model.headers);
				if (!_.isEmpty(headers)) ramlDef.headers = headers;
			}
		}
		
		if (model.hasOwnProperty('parameters')) {
			if (_.isArray(model.parameters) && !_.isEmpty(model.parameters)) {
				const parameterConverter = new Raml10ParameterConverter(this.model, this.parentResource, traitModels, inheritedParams);
				const queryParameters = parameterConverter.export(model.parameters, inheritedParams);
				if (!_.isEmpty(queryParameters)) ramlDef.queryParameters = queryParameters;
			}
		}
		
		const body = Raml10MethodConverter.exportBodies(model, definitionConverter, traitModels, inheritedBodies);
		if (!_.isEmpty(body)) ramlDef.body = body;
		
		if (model.hasOwnProperty('annotations')) {
			if (_.isArray(model.annotations) && !_.isEmpty(model.annotations)) {
				const annotationConverter = new Raml10AnnotationConverter();
				_.assign(ramlDef, annotationConverter._export(model));
			}
		}

		if (model.hasOwnProperty('securedBy')) {
			ramlDef.securedBy = Raml10MethodConverter.exportSecurityRequirements(model);
		}
		
		return ramlDef;
	}

	static exportSecurityRequirements(object) {
		const security = [];
		for (const key in object.securedBy) {
			if (!object.securedBy.hasOwnProperty(key)) continue;

			const securityReq = object.securedBy[key];
			security.push(securityReq.name);
		}
		return security;
	}
	
	static exportBodies(object, converter, traitModels, inheritedBodies) {
		const body = {};
		if (object.hasOwnProperty('bodies')) {
			if (_.isArray(object.bodies) && !_.isEmpty(object.bodies)) {
				for (const index in object.bodies) {
					if (!object.bodies.hasOwnProperty(index)) continue;
					
					const val = object.bodies[index];
					const mimeType = val.mimeType ? val.mimeType : 'application/json';
					let names = [];
					if (traitModels) names = traitModels.map(traitModel => {
						return traitModel.name + ':' + mimeType;
					});
					const inheritedBody = _.intersection(inheritedBodies, names);
					if (_.isEmpty(inheritedBody)) {
						body[mimeType] = converter._export(val.definition);
						if (val.definition.hasOwnProperty('annotations')) {
							const annotationConverter = new Raml10AnnotationConverter();
							_.assign(body[mimeType], annotationConverter._export(val.definition));
						}
						Raml10MethodConverter.exportRequired(val, body[mimeType]);
						if (val.hasOwnProperty('annotations')) {
							const annotationConverter = new Raml10AnnotationConverter();
							_.assign(body[mimeType], annotationConverter._export(val));
						}
					}
				}
			}
		}
		
		if (object.hasOwnProperty('formBodies')) {
			if (_.isArray(object.formBodies) && !_.isEmpty(object.formBodies)) {
				for (const index in object.formBodies) {
					if (!object.formBodies.hasOwnProperty(index)) continue;
					
					const val = object.formBodies[index];
					const mimeType = val.mimeType && helper.getValidFormDataMimeTypes.includes(val.mimeType)? val.mimeType : 'multipart/form-data';
					if (!body.hasOwnProperty(mimeType)) {
						body[mimeType] = converter._export(val.definition);
						if (!val.hasOwnProperty('val.description')) body[mimeType].description = val.description;
						Raml10MethodConverter.exportRequired(val, body[mimeType]);
						if (val.hasOwnProperty('annotations')) {
							const annotationConverter = new Raml10AnnotationConverter();
							_.assign(body[mimeType], annotationConverter._export(val));
						}
					}
				}
			}
		}
		return body;
	}
	
	static exportRequired(source, target) {
		if (source.hasOwnProperty('required')) target.required = source.required;
		if (target.hasOwnProperty('required') && target.required)
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

	import(ramlDefs) {
		let result = [];
		if (_.isEmpty(ramlDefs)) return result;
		
		for (const id in ramlDefs) {
			if (!ramlDefs.hasOwnProperty(id)) continue;
			
			const ramlDef = ramlDefs[id];
			result.push(this._import(ramlDef));
		}
		return result;
	}

	// imports 1 method definition
	_import(ramlDef) {
		const attrIdMap = {
			'displayName': 'name'
		};

		const attrIdSkip = ['responses', 'headers', 'body', 'queryParameters', 'name', 'usage', 'securedBy', 'annotations'];
		const model = Raml10MethodConverter.copyObjectFrom(ramlDef, attrIdMap, attrIdSkip);
		const definitionConverter = new Raml10DefinitionConverter();
		
		if (ramlDef.hasOwnProperty('responses')) {
			const responses = [];
			if (_.isArray(ramlDef.responses)) {
				const attrSecurityIdMap = {
					'code': 'httpStatusCode'
				};
				for (const id in ramlDef.responses) {
					if (!ramlDef.responses.hasOwnProperty(id)) continue;

					let response = new Response();
					response = Converter.copyObjectFrom(ramlDef.responses[id], attrSecurityIdMap, []);
					responses.push(response);
				}
			} else {
				for (const id in ramlDef.responses) {
					if (!ramlDef.responses.hasOwnProperty(id)) continue;

					const value = ramlDef.responses[id];
					let response = new Response();
					response.httpStatusCode = id;
					if (value.hasOwnProperty('description')) response.description = value.description;
					response.bodies = Raml10MethodConverter.importBodies(value, definitionConverter);
					if (value.hasOwnProperty('annotations') && !_.isEmpty(value.annotations)) {
						const annotationConverter = new Raml10AnnotationConverter();
						const annotations = annotationConverter._import(value);
						if (!_.isEmpty(annotations)) response.annotations = annotations;
					}
					responses.push(response);
				}
			}
			model.responses = responses;
		}
		
		if (ramlDef.hasOwnProperty('headers')) {
			const parameterConverter = new Raml10ParameterConverter();
			const headers = [];
			for (const id in ramlDef.headers) {
				if (!ramlDef.headers.hasOwnProperty(id)) continue;
				
				const headerDef = ramlDef.headers[id];
				const header = parameterConverter._import(headerDef);
				header._in = 'header';
				headers.push(header);
			}
			model.headers = headers;
		}
		
		if (ramlDef.hasOwnProperty('queryParameters')) {
			const parameterConverter = new Raml10ParameterConverter();
			const parameters = [];
			for (const id in ramlDef.queryParameters) {
				if (!ramlDef.queryParameters.hasOwnProperty(id)) continue;
				
				const parameter = parameterConverter._import(ramlDef.queryParameters[id]);
				parameter._in = 'query';
				parameters.push(parameter);
			}
			model.parameters = parameters;
		}
		
		const bodies = Raml10MethodConverter.importBodies(ramlDef, definitionConverter);
		if (!_.isEmpty(bodies)) model.bodies = bodies;
		
		if (ramlDef.hasOwnProperty('body') && _.isEmpty(model.bodies)) {
			const formBodies = [];
			for (const id in ramlDef.body) {
				if (!ramlDef.body.hasOwnProperty(id) || !helper.getValidFormDataMimeTypes.includes(id)) continue;
				
				const value = ramlDef.body[id];
				const body = new Body();
				body.mimeType = id;
				body.definition = definitionConverter._import(value);
				body.definition.name = 'formData';
				if (value.hasOwnProperty('description')) body.description = value.description;
				Raml10MethodConverter.importRequired(value, body);
				if (value.hasOwnProperty('examples')) Raml10MethodConverter.importExamples(value, body.definition);
				if (value.hasOwnProperty('annotations') && !_.isEmpty(value.annotations)) {
					const annotationConverter = new Raml10AnnotationConverter();
					const annotations = annotationConverter._import(value);
					if (!_.isEmpty(annotations)) body.annotations = annotations;
					delete body.definition.annotations;
				}
				formBodies.push(body);
			}
			if (!_.isEmpty(formBodies)) model.formBodies = formBodies;
		}
		
		const annotations = [];
		if (ramlDef.hasOwnProperty('annotations')) {
			if (!_.isEmpty(ramlDef.annotations)) {
				const annotationConverter = new Raml10AnnotationConverter();
				const annotations = annotationConverter._import(ramlDef);
				if (!_.isEmpty(annotations)) model.annotations = annotations;
			}
		}

		if (ramlDef.hasOwnProperty('securedBy')) {
			model.securedBy = Raml10MethodConverter.importSecurityRequirements(ramlDef);
		}
		
		return model;
	}

	static importSecurityRequirements(object){
		const securedBy = [];
		object.securedBy.map(security => {
			const securityReq = new SecurityRequirement();
			securityReq.name = security;
			securityReq.scopes = [];
			securedBy.push(securityReq);
		});
		return securedBy;
	}
	
	static importBodies(object, converter) {
		const bodies = [];
		
		if (object.hasOwnProperty('body')) {
			for (const id in object.body) {
				if (!object.body.hasOwnProperty(id) || helper.getValidFormDataMimeTypes.includes(id)) continue;
				
				const value = object.body[id];
				const body = new Body();
				body.mimeType = id;
				let schema = value.hasOwnProperty('schema') ? value.schema : value;
				if (_.isArray(schema)) schema = { type: schema };
				body.definition = converter._import(schema);
				if (!schema.hasOwnProperty('type')) delete body.definition.internalType;
				Raml10MethodConverter.importRequired(value, body);
				if (value.hasOwnProperty('examples')) Raml10MethodConverter.importExamples(value, body.definition);
				if (value.hasOwnProperty('annotations') && !_.isEmpty(value.annotations)) {
					const annotationConverter = new Raml10AnnotationConverter();
					const annotations = annotationConverter._import(value);
					if (!_.isEmpty(annotations)) body.annotations = annotations;
					delete body.definition.annotations;
				}
				bodies.push(body);
			}
		}
		
		return bodies;
	}
	
	static importRequired(source, target) {
		target.required = source.hasOwnProperty('required') ? source.required : true;
	}
	
	static importExamples(source, target) {
		const example = {};
		for (const id in source.examples) {
			if (!source.examples.hasOwnProperty(id)) continue;
			
			const value = source.examples[id];
			example[value.name] = value.structuredValue;
		}
		target.example = example;
		delete target.examples;
	}
	
}

module.exports = Raml10MethodConverter;