const _ = require('lodash');
const Method = require('../model/method');
const Response = require('../model/response');
const Body = require('../model/body');
const Parameter = require('../model/parameter');
const Converter = require('../model/converter');
const SecurityRequirement = require('../model/securityRequirement');
const Raml10RootConverter = require('../raml10/raml10RootConverter');
const Raml10DefinitionConverter = require('../raml10/raml10DefinitionConverter');
const ParameterConverter = require('../common/parameterConverter');
const Raml10AnnotationConverter = require('../raml10/raml10AnnotationConverter');
const Raml10CustomAnnotationConverter = require('../raml10/raml10CustomAnnotationConverter');
const helper = require('../helpers/converter');
const ramlHelper = require('../helpers/raml');
const jsonHelper = require('../utils/json');

class Raml10MethodConverter extends Converter {
	
	export(models) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		models.map(model => {
			const method = this._export(model);
			result[model.method] = !_.isEmpty(method) ? method : null;
		});
		
		return result;
	}
	
	// exports 1 method definition
	_export(model) {
		const attrIdMap = {
			'name': 'displayName'
		};

		const attrIdSkip = ['responses', 'headers', 'bodies', 'formBodies', 'method', 'parameters', 'queryStrings', 'consumes', 'usage', 'path', 'produces', 'securedBy', 'annotations', 'tags', 'summary', 'externalDocs', 'deprecated', 'protocols'];
		const ramlDef = Raml10MethodConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);
		const definitionConverter = new Raml10DefinitionConverter(this.model, this.annotationPrefix, this.def);
		
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
						const internalMimeTypes = model.hasOwnProperty('produces') ? model.produces : [];
						const globalMimeTypes = this.model.hasOwnProperty('mediaType') && this.model.mediaType.hasOwnProperty('produces') ? this.model.mediaType.produces : [];
						const mimeTypes = !_.isEmpty(internalMimeTypes) ? internalMimeTypes : globalMimeTypes;
						const body = Raml10MethodConverter.exportBodies(val, definitionConverter, mimeTypes, this.model, this.annotationPrefix, this.def);
						const bodyDef = body[Object.keys(body)[0]];
						if (bodyDef && bodyDef.hasOwnProperty('examples')) {
							bodyDef.example = bodyDef.hasOwnProperty('example') ? _.concat(bodyDef.examples, bodyDef.example) : bodyDef.examples;
							delete bodyDef.examples;
						}
						if (!_.isEmpty(body)) response.body = body;
						
						if (val.hasOwnProperty('global-response-definition')) {
							const id = this.annotationPrefix + '-global-response-definition';
							Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
							response['(' + id + ')'] = val['global-response-definition'];
						}
						Raml10RootConverter.exportAnnotations(this.model, this.annotationPrefix, this.def, val, response);
						if (val.httpStatusCode === 'default') {
							const id = this.annotationPrefix + '-responses-default';
							Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
							ramlDef['(' + id + ')'] = response;
						} else responses[val.httpStatusCode] = response;
					}
				}
				if (!_.isEmpty(responses)) ramlDef.responses = responses;
			}
		}
		
		if (model.hasOwnProperty('headers')) {
			if (_.isArray(model.headers) && !_.isEmpty(model.headers)) {
				const parameterConverter = new ParameterConverter(this.model, this.annotationPrefix, this.def);
				const headers = parameterConverter.export(model.headers);
				if (!_.isEmpty(headers)) ramlDef.headers = headers;
			}
		}
		
		if (model.hasOwnProperty('parameters')) {
			if (_.isArray(model.parameters) && !_.isEmpty(model.parameters)) {
				const parameterConverter = new ParameterConverter(this.model, this.annotationPrefix, this.def, 'query');
				const queryParameters = parameterConverter.export(model.parameters);
				if (!_.isEmpty(queryParameters)) ramlDef.queryParameters = queryParameters;
			}
		}
		
		if (model.hasOwnProperty('queryStrings')) {
			if (_.isArray(model.queryStrings) && !_.isEmpty(model.queryStrings)) {
				const parameterConverter = new ParameterConverter(this.model, this.annotationPrefix, this.def, 'query');
				const queryString = parameterConverter.export(model.queryStrings);
				if (!_.isEmpty(queryString)) ramlDef.queryString = queryString.queryString;
			}
		}
		
		const internalMimeTypes = model.hasOwnProperty('consumes') ? model.consumes : [];
		const globalMimeTypes = this.model.hasOwnProperty('mediaType') && this.model.mediaType.hasOwnProperty('consumes') ? this.model.mediaType.consumes : [];
		const mimeTypes = !_.isEmpty(internalMimeTypes) ? internalMimeTypes : globalMimeTypes;
		const body = Raml10MethodConverter.exportBodies(model, definitionConverter, mimeTypes, this.model, this.annotationPrefix, this.def);
		if (!_.isEmpty(body)) ramlDef.body = body;
		
		if (model.hasOwnProperty('securedBy')) {
			ramlDef.securedBy = Raml10MethodConverter.exportSecurityRequirements(model);
		}

		if (model.hasOwnProperty('protocols')) {
			ramlDef.protocols = model.protocols.map(function(protocol){ return protocol.toUpperCase(); });
		}
		
		if (model.hasOwnProperty('summary')) {
			const id = this.annotationPrefix + '-summary';
			Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.summary;
		}
		if (model.hasOwnProperty('tags')) {
			const id = this.annotationPrefix + '-tags';
			Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.tags;
		}
		if (model.hasOwnProperty('deprecated') && model.deprecated) {
			const id = this.annotationPrefix + '-deprecated';
			Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.deprecated;
		}
		if (model.hasOwnProperty('externalDocs')) {
			const id = this.annotationPrefix + '-externalDocs';
			Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.externalDocs;
		}
		Raml10RootConverter.exportAnnotations(this.model, this.annotationPrefix, this.def, model, ramlDef);
		
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
	
	static exportBodies(object, converter, mimeTypes, model, annotationPrefix, ramlDef) {
		const body = {};
		if (object.hasOwnProperty('bodies')) {
			if (_.isArray(object.bodies) && !_.isEmpty(object.bodies)) {
				for (const index in object.bodies) {
					if (!object.bodies.hasOwnProperty(index)) continue;
					
					const val = object.bodies[index];
					const bodyDef = {};
					const schema = converter._export(val.definition);
					if (val.hasOwnProperty('description')) {
						bodyDef.description = val.description;
						if (val.definition.hasOwnProperty('description')) bodyDef.schema = schema;
						else _.assign(bodyDef, schema);
					} else _.assign(bodyDef, schema);
					if (bodyDef.hasOwnProperty('schema')) {
						_.assign(bodyDef, bodyDef.schema);
						delete bodyDef.schema;
					}
					Raml10MethodConverter.exportRequired(val, bodyDef);
					if (val.hasOwnProperty('name')) {
						const id = annotationPrefix + '-body-name';
						Raml10CustomAnnotationConverter._createAnnotationType(ramlDef, annotationPrefix, id);
						bodyDef['(' + id + ')'] = val.name;
					}
					Raml10RootConverter.exportAnnotations(model, annotationPrefix, ramlDef, val, bodyDef);
					if (val.mimeType) {
						body[val.mimeType] = bodyDef;
					} else {
						if (_.isEmpty(mimeTypes)) mimeTypes.push('application/json');
						for (const id in mimeTypes) {
							if (!mimeTypes.hasOwnProperty(id)) continue;
							
							body[mimeTypes[id]] = bodyDef;
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
					const mimeType = val.mimeType ? val.mimeType : (!_.isEmpty(mimeTypes) && helper.getValidFormDataMimeTypes.includes(mimeTypes[0]) ? mimeTypes[0] : 'multipart/form-data');
					const bodyDef = converter._export(val.definition);
					if (val.hasOwnProperty('description')) bodyDef.description = val.description;
					Raml10MethodConverter.exportRequired(val, bodyDef);
					Raml10RootConverter.exportAnnotations(model, annotationPrefix, ramlDef, val, bodyDef);
					if (!body[mimeType]) {
						body[mimeType] = {};
						body[mimeType].properties = {};
					}
					body[mimeType].properties[val.definition.name] = bodyDef;
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
		
		for (const id in object) {
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

		const attrIdSkip = ['responses', 'description', 'headers', 'body', 'queryParameters', 'queryString', 'name', 'usage', 'is', 'securedBy', 'baseUriParameters', 'annotations', 'protocols'];
		const model = Raml10MethodConverter.copyObjectFrom(ramlDef, attrIdMap, attrIdSkip);
		const definitionConverter = new Raml10DefinitionConverter(null, null, this.def);
		definitionConverter.version = this.version;
		const isRaml08Version = ramlHelper.isRaml08Version(this.version);
		
		if (ramlDef.hasOwnProperty('is') && _.isArray(ramlDef.is)) {
			const is = [];
			for (const id in ramlDef.is) {
				if (!ramlDef.is.hasOwnProperty(id)) continue;
				
				const value = ramlDef.is[id];
				if (typeof value === 'string') {
					is.push({ name: value });
				} else if (typeof value === 'object' && value !== undefined) {
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
					const bodies = Raml10MethodConverter.importBodies(value, definitionConverter, this.model, isRaml08Version);
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
				if (_.isArray(value)) continue;
				const hasParams = Raml10MethodConverter.hasParams(value);
				const parameter = parameterConverter._import(value);
				parameter._in = 'query';
				if (hasParams) parameter.hasParams = true;
				parameters.push(parameter);
			}
			model.parameters = parameters;
		}
		
		if (ramlDef.hasOwnProperty('queryString')) {
			const queryStrings = [];
			const queryString = new Parameter();
			queryString.definition = definitionConverter._import(ramlDef.queryString);
			Raml10MethodConverter.importRequired(ramlDef.queryString, queryString, isRaml08Version);
			queryString._in = 'query';
			queryString.name = 'queryString';
			queryStrings.push(queryString);
			model.queryStrings = queryStrings;
		}

		const bodies = Raml10MethodConverter.importBodies(ramlDef, definitionConverter, this.model, isRaml08Version);
		if (!_.isEmpty(bodies)) model.bodies = bodies;
		
		if (ramlDef.hasOwnProperty('body') && _.isEmpty(model.bodies)) {
			const formBodies = [];
			for (const id in ramlDef.body) {
				if (!ramlDef.body.hasOwnProperty(id) || !helper.getValidFormDataMimeTypes.includes(id)) continue;
				
				const value = ramlDef.body[id];
				if (isRaml08Version && value.hasOwnProperty('formParameters')) {
					for (const index in value.formParameters) {
						if (!value.hasOwnProperty('formParameters')) continue;
						
						const val = value.formParameters[index];
						formBodies.push(Raml10MethodConverter.importFormBodies(val, id, index, definitionConverter, isRaml08Version));
					}
				} else {
					formBodies.push(Raml10MethodConverter.importFormBodies(value, id, 'formData', definitionConverter, isRaml08Version));
				}
			}
			if (!_.isEmpty(formBodies)) model.formBodies = formBodies;
		}
		
		if (isRaml08Version && ramlDef.hasOwnProperty('baseUriParameters')) {
			const parameterConverter = new ParameterConverter();
			for (const id in ramlDef.baseUriParameters) {
				if (!ramlDef.baseUriParameters.hasOwnProperty(id)) continue;
				
				if (this.model.baseUriParameters) this.model.baseUriParameters.push(parameterConverter._import(ramlDef.baseUriParameters[id]));
			}
		}
		
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

		if (ramlDef.hasOwnProperty('protocols')){
			if (_.isArray(ramlDef.protocols)){
				model.protocols = ramlDef.protocols.map(function(protocol){ return protocol.toLowerCase(); }) ;
			} else {
				model.protocols = [ramlDef.protocols.toLowerCase()];
			}
		}

		return model;
	}

	static importSecurityRequirements(object){
		const securedBy = [];
		object.securedBy.map(security => {
			const securityReq = new SecurityRequirement();
			if (typeof security === 'object' && security !== null) {
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
	
	static importFormBodies(object, mimeType, name, converter, isRaml08Version) {
		const body = new Body();
		body.mimeType = mimeType;
		body.definition = converter._import(object);
		body.definition.name = name;
		if (object.hasOwnProperty('description')) body.description = object.description;
		Raml10MethodConverter.importRequired(object, body, isRaml08Version);
		if (object.hasOwnProperty('examples')) Raml10MethodConverter.importExamples(object, body.definition);
		Raml10RootConverter.importAnnotations(object, body);
		
		return body;
	}
	
	static importBodies(object, converter, model, isRaml08Version) {
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
				if (value.hasOwnProperty('type') && typeof value.type === 'object' && !_.isArray(value.type)) {
					value.schema = value.type;
					delete value.type;
				}
				if (value.schema == null) delete value.schema;
				let schema = value.hasOwnProperty('schema') ? value.schema : value;
				if (isRaml08Version) Raml10MethodConverter.importRaml08Schema(value, body, converter, model);
				else {
					if (_.isArray(schema)) {
						schema = { type: schema };
						if (helper.isJson(schema.type[0])) schema.typePropertyKind = 'INPLACE';
					}
					if (schema.hasOwnProperty('example') && !schema.example && schema.hasOwnProperty('structuredExample')) {
						schema.example = typeof schema.structuredExample.value === 'string' ? jsonHelper.parse(schema.structuredExample.value) : schema.structuredExample.value;
						delete schema.structuredExample;
					}
					body.definition = converter._import(schema);
				}
				if (model && body.definition.hasOwnProperty('definitions')) {
					if (!model.types) model.types = {};
					const typeNames = Object.keys(model.types);
					for (const typeName in body.definition.definitions) {
						if (!body.definition.definitions.hasOwnProperty(typeName)) continue;

						if (typeNames.indexOf(typeName) < 0) {
							model.types[typeName] = converter._import(body.definition.definitions[typeName]);
						}
					}
					if (_.isEmpty(model.types)) delete model.types;
					delete body.definition.definitions;
				}
				if (!schema.hasOwnProperty('type') && !jsonHelper.parse(schema).hasOwnProperty('type')) delete body.definition.internalType;
				Raml10MethodConverter.importRequired(value, body, isRaml08Version);
				Raml10MethodConverter.importExamples(value, body.definition);
				Raml10RootConverter.importAnnotations(value, body);
				if (hasParams) body.hasParams = true;
				bodies.push(body);
			}
		}
		
		return bodies;
	}
	
	static importRaml08Schema(source, target, converter, model) {
		target.definition = {};
		if (source.hasOwnProperty('example')) {
			target.definition.example = source.example;
			delete target.definition.examples;
		}
		if (source.hasOwnProperty('schema')) {
			let schema = jsonHelper.parse(source.schema);
			let isReference = typeof schema === 'string';
			if (isReference) schema = { type: schema };
			if (helper.isJson(schema.type)) schema.typePropertyKind = 'INPLACE';
			target.definition = converter._import(schema);
			if (isReference) {
				const type = target.definition.type;
				const internalType = target.definition.internalType;
				if (type) target.definition = { reference: type };
				else if (internalType && _.keys(model.types).includes(internalType)) target.definition = { reference: internalType };
			}
			if (source.hasOwnProperty('example')) {
				target.definition.example = jsonHelper.isJson(source.example) ? JSON.parse(source.example) : source.example;
			}
		}
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
	
	static importRequired(source, target, isRaml08Version) {
		target.required = source.hasOwnProperty('required') ? source.required : !isRaml08Version;
	}
	
	static importExamples(source, target) {
		let example = {};
		if (source.hasOwnProperty('examples')) {
			for (const id in source.examples) {
				if (!source.examples.hasOwnProperty(id)) continue;
				
				const value = source.examples[id];
				example[value.name] = value.structuredValue;
			}
			delete target.examples;
		} else if (source.hasOwnProperty('example')) {
			example = jsonHelper.parse(source.example);
		}
		
		if (!_.isEmpty(example)) target.example = example;
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
