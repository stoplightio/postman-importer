const _ = require('lodash');
const Method = require('../model/method');
const Response = require('../model/response');
const Body = require('../model/body');
const Parameter = require('../model/parameter');
const Converter = require('../model/converter');
const Raml10RootConverter = require('../raml10/Raml10RootConverter');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');
const ParameterConverter = require('../common/ParameterConverter');
const Raml10AnnotationConverter = require('../raml10/Raml10AnnotationConverter');
const SecurityRequirement = require('../model/securityRequirement');
const helper = require('../helpers/converter');
const stringsHelper = require('../utils/strings');

class Raml10MethodConverter extends Converter {
	
	constructor(model) {
		super(model);
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

		const attrIdSkip = ['responses', 'headers', 'bodies', 'formBodies', 'method', 'parameters', 'queryStrings', 'consumes', 'usage', 'path', 'produces', 'securedBy', 'annotations', 'tags', 'summary', 'externalDocs'];
		const ramlDef = Raml10MethodConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);
		const definitionConverter = new Raml10DefinitionConverter();
		
		if (!ramlDef.hasOwnProperty('displayName')) ramlDef.displayName = stringsHelper.computeOperationId(model.method, model.path);
		
		if (model.hasOwnProperty('is')) {
			if (_.isArray(model.is) && !_.isEmpty(model.is)) {
				const is = [];
				for (const id in model.is) {
					if (!model.is.hasOwnProperty(id)) continue;
					
					const value = model.is[id];
					let trait;
					if (value.value) {
						trait = {};
						trait[value.name] = value.value;
					}
					else trait = value.name;
					is.push(trait);
				}
				ramlDef.is = is;
			}
		}
		
		let defaultResponse;
		if (model.hasOwnProperty('responses')) {
			if (_.isArray(model.responses) && !_.isEmpty(model.responses)) {
				const responses = {};
				for (const index in model.responses) {
					if (!model.responses.hasOwnProperty(index)) continue;
					
					const val = model.responses[index];
					if (val.hasOwnProperty('httpStatusCode') && !val.hasOwnProperty('reference')) {
						const response = {};
						if (val.hasOwnProperty('description')) response.description = val.description;
						if (val.hasOwnProperty('headers')) {
							if (_.isArray(val.headers) && !_.isEmpty(val.headers)) {
								const parameterConverter = new ParameterConverter(this.model);
								const headers = parameterConverter.export(val.headers);
								if (!_.isEmpty(headers)) response.headers = headers;
							}
						}
						const body = Raml10MethodConverter.exportBodies(val, definitionConverter);
						if (!_.isEmpty(body)) response.body = body;
						
						Raml10RootConverter.exportAnnotations(val, response);
						if (val.httpStatusCode === 'default') defaultResponse = response;
						else responses[val.httpStatusCode] = response;
					}
				}
				if (!_.isEmpty(responses)) ramlDef.responses = responses;
			}
		}
		
		if (model.hasOwnProperty('headers')) {
			if (_.isArray(model.headers) && !_.isEmpty(model.headers)) {
				const parameterConverter = new ParameterConverter(this.model);
				const headers = parameterConverter.export(model.headers);
				if (!_.isEmpty(headers)) ramlDef.headers = headers;
			}
		}
		
		if (model.hasOwnProperty('parameters')) {
			if (_.isArray(model.parameters) && !_.isEmpty(model.parameters)) {
				const parameterConverter = new ParameterConverter(this.model, 'query');
				const queryParameters = parameterConverter.export(model.parameters);
				if (!_.isEmpty(queryParameters)) ramlDef.queryParameters = queryParameters;
			}
		}
		
		if (model.hasOwnProperty('queryStrings')) {
			if (_.isArray(model.queryStrings) && !_.isEmpty(model.queryStrings)) {
				const parameterConverter = new ParameterConverter(this.model, 'query');
				const queryString = parameterConverter.export(model.queryStrings);
				if (!_.isEmpty(queryString)) ramlDef.queryString = queryString.queryString;
			}
		}
		
		const body = Raml10MethodConverter.exportBodies(model, definitionConverter);
		if (!_.isEmpty(body)) ramlDef.body = body;
		
		Raml10RootConverter.exportAnnotations(model, ramlDef);
		if (defaultResponse) ramlDef['(oas-responses-default)'] = defaultResponse;

		if (model.hasOwnProperty('tags')) {
			ramlDef['(oas-tags)'] = model.tags;
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
			if (securityReq.hasOwnProperty('scopes') && !_.isEmpty(securityReq.scopes)) {
        const result = {};
        result[securityReq.name] = { scopes: securityReq.scopes };
        security.push(result);
			} else {
        security.push(securityReq.name);
      }
		}
		return security;
	}
	
	static exportBodies(object, converter) {
		const body = {};
		if (object.hasOwnProperty('bodies')) {
			if (_.isArray(object.bodies) && !_.isEmpty(object.bodies)) {
				for (const index in object.bodies) {
					if (!object.bodies.hasOwnProperty(index)) continue;
					
					const val = object.bodies[index];
					const mimeType = val.mimeType ? val.mimeType : 'application/json';
					const bodyDef = {};
					const schema = converter._export(val.definition);
					if (val.hasOwnProperty('description')) {
						bodyDef.description = val.description;
						if (val.definition.hasOwnProperty('description')) bodyDef.schema = schema;
						else _.assign(bodyDef, schema);
					} else _.assign(bodyDef, schema);
					Raml10RootConverter.exportAnnotations(val.definition, bodyDef);
					Raml10MethodConverter.exportRequired(val, bodyDef);
					Raml10RootConverter.exportAnnotations(val, bodyDef);
					body[mimeType] = bodyDef;
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
						if (val.hasOwnProperty('description')) body[mimeType].description = val.description;
						Raml10MethodConverter.exportRequired(val, body[mimeType]);
						Raml10RootConverter.exportAnnotations(val, body[mimeType]);
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

		const attrIdSkip = ['responses', 'description', 'headers', 'body', 'queryParameters', 'queryString', 'name', 'usage', 'is', 'securedBy', 'annotations'];
		const model = Raml10MethodConverter.copyObjectFrom(ramlDef, attrIdMap, attrIdSkip);
		const definitionConverter = new Raml10DefinitionConverter();
		
		if (ramlDef.hasOwnProperty('is') && _.isArray(ramlDef.is)) {
			const is = [];
			for (const id in ramlDef.is) {
				if (!ramlDef.is.hasOwnProperty(id)) continue;
				
				const value = ramlDef.is[id];
				if (typeof value === 'string') {
					is.push({ name: value });
				} else if (typeof value === 'object') {
					const name = Object.keys(value)[0];
					is.push({
						name: name,
						value: value[name]
					});
				}
			}
			model.is = is;
		}

		if (ramlDef.hasOwnProperty('description') && !_.isEmpty(ramlDef.description)) {
			model.description = ramlDef.description;
		}

		if (ramlDef.hasOwnProperty('responses')) {
			const responses = [];
			if (_.isArray(ramlDef.responses)) {
				const attrSecurityIdMap = {
					'code': 'httpStatusCode'
				};
				for (const id in ramlDef.responses) {
					if (!ramlDef.responses.hasOwnProperty(id)) continue;

					const value = ramlDef.responses[id];
					const hasParams = Raml10MethodConverter.hasParams(value);
					let response = new Response();
					response = Converter.copyObjectFrom(ramlDef.responses[id], attrSecurityIdMap, []);
					if (hasParams) response.hasParams = true;
					responses.push(response);
				}
			} else {
				for (const id in ramlDef.responses) {
					if (!ramlDef.responses.hasOwnProperty(id)) continue;

					const value = ramlDef.responses[id];
					const hasParams = Raml10MethodConverter.hasParams(value);
					let response = new Response();
					response.httpStatusCode = id;
					if (value.hasOwnProperty('description')) response.description = value.description;
					const headers = Raml10MethodConverter.importHeaders(value);
					if (!_.isEmpty(headers)) response.headers = headers;
					const bodies = Raml10MethodConverter.importBodies(value, definitionConverter);
					if (!_.isEmpty(bodies)) response.bodies = bodies;
					Raml10RootConverter.importAnnotations(value, response);
					if (hasParams) response.hasParams = true;
					responses.push(response);
				}
			}
			model.responses = responses;
		}
		
		const headers = Raml10MethodConverter.importHeaders(ramlDef);
		if (!_.isEmpty(headers)) model.headers = headers;
		
		if (ramlDef.hasOwnProperty('queryParameters')) {
			const parameterConverter = new ParameterConverter();
			const parameters = [];
			for (const id in ramlDef.queryParameters) {
				if (!ramlDef.queryParameters.hasOwnProperty(id)) continue;
				
				const value = ramlDef.queryParameters[id];
				const hasParams = Raml10MethodConverter.hasParams(value);
				const parameter = parameterConverter._import(value);
				parameter._in = 'query';
				if (hasParams) parameter.hasParams = true;
				parameters.push(parameter);
			}
			model.parameters = parameters;
		}
		
		if (ramlDef.hasOwnProperty('queryString')) {
			const queryStrings = [];
			const queryString = new Parameter();
			queryString.definition = definitionConverter._import(ramlDef.queryString);
			Raml10MethodConverter.importRequired(ramlDef.queryString, queryString);
			queryString._in = 'query';
			queryString.name = 'queryString';
			queryStrings.push(queryString);
			model.queryStrings = queryStrings;
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
				Raml10RootConverter.importAnnotations(value, body);
				formBodies.push(body);
			}
			if (!_.isEmpty(formBodies)) model.formBodies = formBodies;
		}
		
		const annotations = [];
		if (ramlDef.hasOwnProperty('annotations')) {
			if (!_.isEmpty(ramlDef.annotations)) {
				if (ramlDef.annotations.hasOwnProperty('oas-tags')) {
					model.tags = ramlDef.annotations['oas-tags'].structuredValue;
					delete ramlDef.annotations['oas-tags'];
				}
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
			if (typeof security === 'object') {
				securityReq.name = Object.keys(security)[0];
				if (security[securityReq.name].hasOwnProperty('scopes'))
					securityReq.scopes = security[securityReq.name].scopes;
			} else {
        securityReq.name = security;
        securityReq.scopes = [];
      }
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
				const hasParams = Raml10MethodConverter.hasParams(value);
				const body = new Body();
				body.mimeType = id;
				if (value.hasOwnProperty('description')) {
					body.description = value.description;
					delete value.description;
				}
				let schema = value.hasOwnProperty('schema') ? value.schema : value;
				if (_.isArray(schema)) schema = { type: schema };
				body.definition = converter._import(schema);
				if (!schema.hasOwnProperty('type')) delete body.definition.internalType;
				Raml10MethodConverter.importRequired(value, body);
				if (value.hasOwnProperty('examples')) Raml10MethodConverter.importExamples(value, body.definition);
				Raml10RootConverter.importAnnotations(value, body);
				if (hasParams) body.hasParams = true;
				bodies.push(body);
			}
		}
		
		return bodies;
	}
	
	static importHeaders(object) {
		const headers = [];
		
		if (object.hasOwnProperty('headers')) {
			const parameterConverter = new ParameterConverter();
			for (const id in object.headers) {
				if (!object.headers.hasOwnProperty(id)) continue;
				
				const headerDef = object.headers[id];
				const hasParams = Raml10MethodConverter.hasParams(headerDef);
				const header = parameterConverter._import(headerDef);
				header._in = 'header';
				if (hasParams) header.hasParams = true;
				headers.push(header);
			}
		}
		
		return headers;
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
	
	static hasParams(object) {
		let hasParams = false;
		const regex = /\<<([^)]+)\>>/;
		for (const id in object) {
			const value = object[id];
			if ((typeof value === 'string' && value.match(regex)) ||
				(typeof value === 'number' && isNaN(value))) {
				return true;
			} else if (typeof value === 'object') {
				hasParams = Raml10MethodConverter.hasParams(value);
			}
		}
		
		return hasParams;
	}
	
}

module.exports = Raml10MethodConverter;