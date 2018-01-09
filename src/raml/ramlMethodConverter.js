// @flow
const _ = require('lodash');
const ConverterModel = require('oas-raml-converter-model');
const Root = ConverterModel.Root;
const Resource = ConverterModel.Resource;
const Method = ConverterModel.Method;
const Response = ConverterModel.Response;
const Body = ConverterModel.Body;
const Parameter = ConverterModel.Parameter;
const Item = ConverterModel.Item;
const Header = ConverterModel.Header;
const Definition = ConverterModel.Definition;
const Annotation = ConverterModel.Annotation;
const SecurityRequirement = ConverterModel.SecurityRequirement;
const Converter = require('../converters/converter');
const RamlDefinitionConverter = require('../raml/ramlDefinitionConverter');
const ParameterConverter = require('../common/parameterConverter');
const RamlAnnotationConverter = require('../raml/ramlAnnotationConverter');
const RamlCustomAnnotationConverter = require('../raml/ramlCustomAnnotationConverter');
const helper = require('../helpers/converter');
const ramlHelper = require('../helpers/raml');
const jsonHelper = require('../utils/json');

class RamlMethodConverter extends Converter {
	
	export(models:Method[]) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		for (let i = 0; i < models.length; i++) {
			const model: Method = models[i];
			const method = this._export(model);
			result[model.method] = !_.isEmpty(method) ? method : {};
		}
		
		return result;
	}
	
	// exports 1 method definition
	_export(model:Method) {
		const attrIdMap = {
			'name': 'displayName'
		};

		const attrIdSkip = ['responses', 'headers', 'bodies', 'formBodies', 'method', 'parameters', 'queryStrings', 
			'consumes', 'usage', 'path', 'produces', 'securedBy', 'annotations', 'tags', 'summary', 'externalDocs', 
			'deprecated', 'protocols', 'includePath'];
		const ramlDef = RamlMethodConverter.createRamlDef(model, attrIdMap, attrIdSkip);
		const definitionConverter = new RamlDefinitionConverter(this.model, this.annotationPrefix, this.def);
		
		if (model.hasOwnProperty('is')) {
			if (_.isArray(model.is) && !_.isEmpty(model.is) && model.is != null) {
				const is = [];
				const isList: Item[] = model.is;
				for (let i = 0; i < isList.length; i++) {
					const value = isList[i];
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
			if (_.isArray(model.responses) && !_.isEmpty(model.responses) && model.responses != null) {
				const responses = {};
				const responsesModel: Response[] = model.responses;
				for (let i = 0; i < responsesModel.length; i++) {
					const val: Response = responsesModel[i];
					if (val.hasOwnProperty('httpStatusCode') && !val.hasOwnProperty('reference')) {
						const response = {};
						if (val.hasOwnProperty('description') && !_.isEmpty(val.description)) response.description = val.description;
						if (val.hasOwnProperty('headers') && val.headers) {
							const headersModel: Header[] = val.headers;
							if (_.isArray(headersModel) && !_.isEmpty(headersModel)) {
								const parameterConverter = new ParameterConverter(this.model, this.annotationPrefix, this.def, '');
								const headers = parameterConverter.export(headersModel, true);
								if (!_.isEmpty(headers)) response.headers = headers;
							}
						}
						const internalMimeTypes = model.hasOwnProperty('produces') ? model.produces : [];
						const globalMimeTypes = this.model.hasOwnProperty('mediaType') && this.model.mediaType.hasOwnProperty('produces') ? this.model.mediaType.produces : [];
						const mimeTypes = !_.isEmpty(internalMimeTypes) ? internalMimeTypes : globalMimeTypes;
						const body = RamlMethodConverter.exportBodies(val, definitionConverter, mimeTypes, this.model, this.annotationPrefix, this.def);
						const bodyDef = body[Object.keys(body)[0]];
						if (bodyDef && bodyDef.hasOwnProperty('examples')) {
							const examples: any = bodyDef.examples;
							if (bodyDef.invalidJsonExample || (bodyDef.type && bodyDef.type !== 'string' && typeof examples === 'string')) {
								const id = this.annotationPrefix + '-responses-example';
								RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
								bodyDef['(' + id + ')'] = bodyDef.hasOwnProperty('example') ? _.concat(examples, bodyDef.example) : examples;
								delete bodyDef.invalidJsonExample;
							} else {
								bodyDef.example = bodyDef.hasOwnProperty('example') ? _.concat(examples, bodyDef.example) : examples;
							}
							delete bodyDef.examples;
						}
						if (!_.isEmpty(body)) response.body = body;
						
						if (val.hasOwnProperty('globalResponseDefinition')) {
							const responseDef: ?string = val.globalResponseDefinition;
							const id = this.annotationPrefix + '-global-response-definition';
							RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
							response['(' + id + ')'] = responseDef;
						}
						RamlAnnotationConverter.exportAnnotations(this.model, this.annotationPrefix, this.def, val, response);
						const httpStatusCode: ?string = val.httpStatusCode;
						if (httpStatusCode === 'default') {
							const id = this.annotationPrefix + '-responses-default';
							RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
							ramlDef['(' + id + ')'] = response;
						} else if (httpStatusCode) responses[httpStatusCode] = (_.isEmpty(response)) ? {} : response;
					}
				}
				if (!_.isEmpty(responses)) ramlDef.responses = responses;
			}
		}
		
		if (model.hasOwnProperty('headers') && model.headers != null) {
			const headersModel: Header[] = model.headers;
			if (_.isArray(headersModel) && !_.isEmpty(headersModel)) {
				const parameterConverter = new ParameterConverter(this.model, this.annotationPrefix, this.def, '');
				const headers = parameterConverter.export(headersModel, true);
				if (!_.isEmpty(headers)) ramlDef.headers = headers;
			}
		}
		
		if (model.hasOwnProperty('parameters') && model.parameters != null) {
			const parametersModel : Parameter[] = model.parameters;
			if (_.isArray(parametersModel) && !_.isEmpty(parametersModel)) {
				const parameterConverter = new ParameterConverter(this.model, this.annotationPrefix, this.def, 'query');
				const queryParameters = parameterConverter.export(parametersModel);
				if (!_.isEmpty(queryParameters)) ramlDef.queryParameters = queryParameters;
			}
		}
		
		if (model.hasOwnProperty('queryStrings') && model.queryStrings != null) {
			const queryStringsModel: Parameter[] = model.queryStrings;
			if (_.isArray(queryStringsModel) && !_.isEmpty(queryStringsModel)) {
				const parameterConverter = new ParameterConverter(this.model, this.annotationPrefix, this.def, 'query');
				const queryString: any = parameterConverter.export(queryStringsModel);
				if (!_.isEmpty(queryString)) ramlDef.queryString = queryString.queryString;
			}
		}
		
		const internalMimeTypes = model.hasOwnProperty('consumes') ? model.consumes : [];
		const globalMimeTypes = this.model.hasOwnProperty('mediaType') && this.model.mediaType.hasOwnProperty('consumes') ? this.model.mediaType.consumes : [];
		const mimeTypes = !_.isEmpty(internalMimeTypes) ? internalMimeTypes : globalMimeTypes;
		const body = RamlMethodConverter.exportBodies(model, definitionConverter, mimeTypes, this.model, this.annotationPrefix, this.def);
		if (!_.isEmpty(body)) ramlDef.body = body;
		
		if (model.hasOwnProperty('securedBy')) {
			ramlDef.securedBy = RamlMethodConverter.exportSecurityRequirements(model);
		}

		if (model.hasOwnProperty('protocols') && model.protocols != null) {
			const protocols: string[] = model.protocols;
			ramlDef.protocols = protocols.map(function(protocol){ return protocol.toUpperCase(); });
		}
		
		if (model.hasOwnProperty('summary')) {
			const id = this.annotationPrefix + '-summary';
			RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.summary;
		}
		if (model.hasOwnProperty('tags')) {
			const id = this.annotationPrefix + '-tags';
			RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.tags;
		}
		if (model.hasOwnProperty('deprecated') && model.deprecated) {
			const id = this.annotationPrefix + '-deprecated';
			RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.deprecated;
		}
		if (model.hasOwnProperty('externalDocs')) {
			const id = this.annotationPrefix + '-externalDocs';
			RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.externalDocs;
		}
		RamlAnnotationConverter.exportAnnotations(this.model, this.annotationPrefix, this.def, model, ramlDef);
		
		return ramlDef;
	}

	static exportSecurityRequirements(object:Resource|Method) {
		const security = [];
		
		const securedBy: ?SecurityRequirement[] = object.securedBy;
		if (securedBy != null) {
			for (let i = 0; i < securedBy.length; i++) {
				const securityReq: SecurityRequirement = securedBy[i];
				if (securityReq.hasOwnProperty('scopes') && !_.isEmpty(securityReq.scopes)) {
					const scopes: string[] = securityReq.scopes;
					const result = {};
					result[securityReq.name] = { scopes: scopes };
					security.push(result);
				} else {
					security.push(securityReq.name);
				}
			}
		}
		
		return security;
	}
	
	static exportBodies(object:any, converter:any, mimeTypes:?string[], model:Root, annotationPrefix:string, ramlDef:any) {
		const body = {};
		if (object.hasOwnProperty('bodies')) {
			const bodies: Body[] = object.bodies;
			if (_.isArray(bodies) && !_.isEmpty(bodies)) {
				for (let i = 0; i < bodies.length; i++) {
					const val: Body = bodies[i];
					const definition: ?Definition = val.definition;
					const bodyDef = {};
					const schema = converter._export(definition);
					if (val.hasOwnProperty('description')) {
						bodyDef.description = val.description;
						if (definition != null && definition.hasOwnProperty('description')) bodyDef.schema = schema;
						else _.assign(bodyDef, schema);
					} else _.assign(bodyDef, schema);
					if (bodyDef.hasOwnProperty('schema')) {
						_.assign(bodyDef, bodyDef.schema);
						delete bodyDef.schema;
					}
					RamlMethodConverter.exportRequired(val, bodyDef);
					if (val.hasOwnProperty('name')) {
						const id = annotationPrefix + '-body-name';
						RamlCustomAnnotationConverter._createAnnotationType(ramlDef, annotationPrefix, id);
						bodyDef['(' + id + ')'] = val.name;
					}
					RamlAnnotationConverter.exportAnnotations(model, annotationPrefix, ramlDef, val, bodyDef);
					if (val.mimeType) {
						const mimeType: string = val.mimeType;
						body[mimeType] = bodyDef;
					} else if (mimeTypes != null) {
						if (_.isEmpty(mimeTypes)) mimeTypes.push('application/json');
						for (let j = 0; j < mimeTypes.length; j++) {
							body[mimeTypes[j]] = bodyDef;
						}
					}
				}
			}
		}
		
		if (object.hasOwnProperty('formBodies')) {
			const formBodies: Body[] = object.formBodies;
			if (_.isArray(formBodies) && !_.isEmpty(formBodies) && mimeTypes != null) {
				for (let i = 0; i < formBodies.length; i++) {
					const val: Body = formBodies[i];
					const definition: ?Definition = val.definition;
					const mimeType: string = val.mimeType ? val.mimeType : (!_.isEmpty(mimeTypes) && helper.getValidFormDataMimeTypes.includes(mimeTypes[0]) ? mimeTypes[0] : 'multipart/form-data');
					const bodyDef = converter._export(definition);
					if (val.hasOwnProperty('description')) bodyDef.description = val.description;
					RamlMethodConverter.exportRequired(val, bodyDef);
					RamlAnnotationConverter.exportAnnotations(model, annotationPrefix, ramlDef, val, bodyDef);
					if (!body[mimeType]) {
						body[mimeType] = {};
						body[mimeType].properties = {};
					}
					if (definition != null) body[mimeType].properties[definition.name] = bodyDef;
				}
			}
		}
		return body;
	}
	
	static exportRequired(source:Body, target:any) {
		if (source.hasOwnProperty('required')) target.required = source.required;
		if (target.hasOwnProperty('required') && target.required)
			delete target.required;
	}
	
	static createRamlDef(method:Method, attrIdMap, attrIdSkip) {
		const result = {};
		
		_.assign(result, method);
		attrIdSkip.map(id => {
			delete result[id];
		});
		_.keys(attrIdMap).map(id => {
			const value = result[id];
			if (value != null) {
				result[attrIdMap[id]] = value;
				delete result[id];
			}
		});
		
		return result;
	}
	
	static createMethod(ramlDef, attrIdMap, attrIdSkip) {
		const object = {};
		
		_.entries(ramlDef).map(([key, value]) => {
			if (attrIdSkip.indexOf(key) < 0 && !key.startsWith('x-')) {
				object[attrIdMap.hasOwnProperty(key) ? attrIdMap[key] : key] = value;
			}
		});
		const result = new Method();
		_.assign(result, object);
		
		return result;
	}

	static createResponse(ramlDef, attrIdMap, attrIdSkip) {
		const object = {};
		
		_.entries(ramlDef).map(([key, value]) => {
			if (attrIdSkip.indexOf(key) < 0 && !key.startsWith('x-')) {
				object[attrIdMap.hasOwnProperty(key) ? attrIdMap[key] : key] = value;
			}
		});
		const result = new Response();
		_.assign(result, object);
		
		return result;
	}

	import(ramlDefs:any) {
		let result = [];
		if (_.isEmpty(ramlDefs)) return result;
		
		for (const id in ramlDefs) {
			if (!ramlDefs.hasOwnProperty(id)) continue;
			
			const ramlDef = ramlDefs[id];
			const method: Method = this._import(ramlDef);
			result.push(method);
		}
		return result;
	}

	// imports 1 method definition
	_import(ramlDef:any) {
		const attrIdMap = {
			'displayName': 'name'
		};

		const attrIdSkip = ['responses', 'description', 'headers', 'body', 'queryParameters', 'queryString', 'name', 
			'usage', 'is', 'securedBy', 'baseUriParameters', 'annotations', 'protocols', 'sourceMap'];
		const model: Method = RamlMethodConverter.createMethod(ramlDef, attrIdMap, attrIdSkip);
		const definitionConverter = new RamlDefinitionConverter(null, null, this.def);
		definitionConverter.version = this.version;
		const isRaml08Version = ramlHelper.isRaml08Version(this.version);
		
		if (ramlDef.hasOwnProperty('is') && _.isArray(ramlDef.is)) {
			const is: Item[] = [];
			for (const id in ramlDef.is) {
				if (!ramlDef.is.hasOwnProperty(id)) continue;
				
				const value = ramlDef.is[id];
				if (typeof value === 'string') {
					const item = new Item();
					item.name = value;
					is.push(item);
				} else if (typeof value === 'object' && value != null) {
					const name: string = Object.keys(value)[0];
					const item = new Item();
					item.name = name;
					item.value = value[name];
					is.push(item);
				}
			}
			model.is = is;
		}

		if (ramlDef.hasOwnProperty('description') && !_.isEmpty(ramlDef.description)) {
			model.description = ramlDef.description;
		}

		if (ramlDef.hasOwnProperty('responses')) {
			const responses: Response[] = [];
			if (_.isArray(ramlDef.responses)) {
				const attrSecurityIdMap = {
					'code': 'httpStatusCode'
				};
				for (const id in ramlDef.responses) {
					if (!ramlDef.responses.hasOwnProperty(id)) continue;

					const value = ramlDef.responses[id];
					const hasParams: boolean = RamlMethodConverter.hasParams(value);
					const response: Response = RamlMethodConverter.createResponse(ramlDef.responses[id], attrSecurityIdMap, []);
					if (hasParams) response.hasParams = true;
					responses.push(response);
				}
			} else {
				for (const id in ramlDef.responses) {
					if (!ramlDef.responses.hasOwnProperty(id)) continue;

					const value = ramlDef.responses[id];
					const hasParams: boolean = RamlMethodConverter.hasParams(value);
					let response = new Response();
					response.httpStatusCode = id;
					if (value.hasOwnProperty('description')) response.description = value.description;
					const headers: Header[] = RamlMethodConverter.importHeaders(value);
					if (!_.isEmpty(headers)) response.headers = headers;
					const bodies: Body[] = RamlMethodConverter.importBodies(value, definitionConverter, this.model, isRaml08Version);
					if (!_.isEmpty(bodies)) response.bodies = bodies;
					RamlAnnotationConverter.importAnnotations(value, response, this.model);
					if (hasParams) response.hasParams = true;
					responses.push(response);
				}
			}
			model.responses = responses;
		}
		
		const headers: Header[] = RamlMethodConverter.importHeaders(ramlDef);
		if (!_.isEmpty(headers)) model.headers = headers;
		
		if (ramlDef.hasOwnProperty('queryParameters')) {
			const parameterConverter = new ParameterConverter(this.model, this.annotationPrefix, this.def, '');
			const parameters: Parameter[] = [];
			for (const id in ramlDef.queryParameters) {
				if (!ramlDef.queryParameters.hasOwnProperty(id)) continue;
				
				const value = ramlDef.queryParameters[id];
				if (_.isArray(value)) continue;
				const hasParams: boolean = RamlMethodConverter.hasParams(value);
				const parameter: Parameter = parameterConverter._import(value);
				parameter._in = 'query';
				if (hasParams) parameter.hasParams = true;
				parameters.push(parameter);
			}
			model.parameters = parameters;
		}
		
		if (ramlDef.hasOwnProperty('queryString')) {
			const queryStrings: Parameter[] = [];
			const queryString = new Parameter();
			const definition: Definition = definitionConverter._import(ramlDef.queryString);
			queryString.definition = definition;
			RamlMethodConverter.importRequired(ramlDef.queryString, queryString, isRaml08Version);
			queryString._in = 'query';
			queryString.name = 'queryString';
			queryStrings.push(queryString);
			model.queryStrings = queryStrings;
		}

		const bodies: Body[] = RamlMethodConverter.importBodies(ramlDef, definitionConverter, this.model, isRaml08Version);
		if (!_.isEmpty(bodies)) model.bodies = bodies;
		
		if (ramlDef.hasOwnProperty('body') && _.isEmpty(model.bodies)) {
			const formBodies: Body[] = [];
			for (const id in ramlDef.body) {
				if (!ramlDef.body.hasOwnProperty(id) || !helper.getValidFormDataMimeTypes.includes(id)) continue;
				
				const value = ramlDef.body[id];
				if (isRaml08Version && value.hasOwnProperty('formParameters')) {
					for (const index in value.formParameters) {
						if (!value.hasOwnProperty('formParameters')) continue;
						
						const val = value.formParameters[index];
						const formBody: Body = RamlMethodConverter.importFormBodies(val, id, index, definitionConverter, isRaml08Version);
						formBodies.push(formBody);
					}
				} else {
					const formBody: Body = RamlMethodConverter.importFormBodies(value, id, 'formData', definitionConverter, isRaml08Version);
					formBodies.push(formBody);
				}
			}
			if (!_.isEmpty(formBodies)) model.formBodies = formBodies;
		}
		
		if (isRaml08Version && ramlDef.hasOwnProperty('baseUriParameters')) {
			const parameterConverter = new ParameterConverter(this.model, this.annotationPrefix, this.def, '');
			for (const id in ramlDef.baseUriParameters) {
				if (!ramlDef.baseUriParameters.hasOwnProperty(id)) continue;
				
				const baseUriParameter: Parameter = parameterConverter._import(ramlDef.baseUriParameters[id]);
				if (this.model.baseUriParameters) this.model.baseUriParameters.push(baseUriParameter);
			}
		}
		
		if (ramlDef.hasOwnProperty('annotations')) {
			if (!_.isEmpty(ramlDef.annotations)) {
				if (ramlDef.annotations.hasOwnProperty('oas-tags')) {
					const tags: string[] = ramlDef.annotations['oas-tags'].structuredValue;
					model.tags = tags;
					delete ramlDef.annotations['oas-tags'];
				}
				const annotationConverter = new RamlAnnotationConverter();
				const annotations: Annotation[] = annotationConverter._import(ramlDef);
				if (!_.isEmpty(annotations)) model.annotations = annotations;
			}
		}

		if (ramlDef.hasOwnProperty('securedBy')) {
			const securedBy: SecurityRequirement[] = RamlMethodConverter.importSecurityRequirements(ramlDef);
			model.securedBy = securedBy;
		}

		if (ramlDef.hasOwnProperty('protocols')){
			if (_.isArray(ramlDef.protocols)){
				const protocols: string[] = ramlDef.protocols.map((protocol) => protocol.toLowerCase());
				model.protocols = protocols;
			} else {
				const protocols: string[] = [ramlDef.protocols.toLowerCase()];
				model.protocols = protocols;
			}
		}

		if (ramlDef.hasOwnProperty('sourceMap') && ramlDef['sourceMap'].hasOwnProperty('path')) {
			model['includePath'] = ramlDef['sourceMap']['path'];
		}

		return model;
	}

	static importSecurityRequirements(object:any) {
		const securedBy: SecurityRequirement[] = [];
		object.securedBy.map(security => {
			const securityReq = new SecurityRequirement();
			if (typeof security === 'object' && security !== null) {
				securityReq.name = Object.keys(security)[0];
				if (security[securityReq.name].hasOwnProperty('scopes')) {
					const scopes: string[] = security[securityReq.name].scopes;
					securityReq.scopes = scopes;
				}
			} else {
				securityReq.name = security;
				securityReq.scopes = [];
			}
      
			securedBy.push(securityReq);
		});
		
		return securedBy;
	}
	
	static importFormBodies(object:any, mimeType:string, name:string, converter:any, isRaml08Version:boolean) {
		const body = new Body();
		body.mimeType = mimeType;
		const definition: Definition = converter._import(object);
		definition.name = name;
		if (object.hasOwnProperty('description')) body.description = object.description;
		RamlMethodConverter.importRequired(object, body, isRaml08Version);
		if (object.hasOwnProperty('examples')) RamlMethodConverter.importExamples(object, definition);
		body.definition = definition;
		RamlAnnotationConverter.importAnnotations(object, body, this.model);
		
		return body;
	}
	
	static importBodies(object:any, converter:any, model:Root, isRaml08Version:boolean) {
		const bodies: Body[] = [];
		
		if (object.hasOwnProperty('body')) {
			for (const id in object.body) {
				if (!object.body.hasOwnProperty(id) || helper.getValidFormDataMimeTypes.includes(id)) continue;
				
				const value = object.body[id];
				const hasParams: boolean = RamlMethodConverter.hasParams(value);
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
				let schema: any = value.hasOwnProperty('schema') ? value.schema : value;
				if (isRaml08Version) RamlMethodConverter.importRaml08Schema(value, body, converter, model);
				else {
					if (_.isArray(schema)) {
						if (helper.isJson(schema[0])) {
							schema = { type: schema, typePropertyKind: 'INPLACE' };
						} else schema = { type: schema };
					}
					if (schema.hasOwnProperty('example') && !schema.example && schema.hasOwnProperty('structuredExample')) {
						schema.example = typeof schema.structuredExample.value === 'string' ? jsonHelper.parse(schema.structuredExample.value) : schema.structuredExample.value;
						delete schema.structuredExample;
					}
					const definition: Definition = converter._import(schema);
					body.definition = definition;
				}
				const def: ?Definition = body.definition;
				if (model && def != null && def.hasOwnProperty('definitions')) {
					const types: Definition[] = model.types ? model.types : [];
					const typeNames = types.map(type => { return type.name; });
					const defs: ?any = def.definitions;
					for (const typeName in defs) {
						if (!defs.hasOwnProperty(typeName)) continue;

						if (typeNames.indexOf(typeName) < 0) {
							const definition: Definition = converter._import(defs[typeName]);
							definition.name = typeName;
							types.push(definition);
						}
					}
					if (!_.isEmpty(types)) model.types = types;
					delete def.definitions;
				}
				if (def != null) {
					if (!schema.hasOwnProperty('type') && !jsonHelper.parse(schema).hasOwnProperty('type')) delete def.internalType;
					RamlMethodConverter.importRequired(value, body, isRaml08Version);
					RamlMethodConverter.importExamples(value, def);
				}
				RamlAnnotationConverter.importAnnotations(value, body, this.model);
				if (hasParams) body.hasParams = true;
				bodies.push(body);
			}
		}
		
		return bodies;
	}
	
	static importRaml08Schema(source:any, target:Body, converter:any, model:Root) {
		let definition = new Definition();
		if (source.hasOwnProperty('example')) {
			definition.example = source.example;
			delete definition.examples;
		}
		if (source.hasOwnProperty('schema')) {
			let schema: any = jsonHelper.parse(source.schema);
			let isReference: boolean = typeof schema === 'string';
			if (isReference) schema = { type: schema };
			if (helper.isJson(schema.type)) schema.typePropertyKind = 'INPLACE';
			definition = converter._import(schema);
			if (isReference) {
				const type: string = definition.type;
				const internalType: string = definition.internalType;
				const typeNames: string[] = model && model.types ? model.types.map(type => { return type.name; }) : [];
				if (type) {
					definition = new Definition();
					definition.reference = type;
				}
				else if (internalType && typeNames.includes(internalType)) {
					definition = new Definition();
					definition.reference = internalType;
				}
			}
			if (source.hasOwnProperty('example')) {
				definition.example = jsonHelper.isJson(source.example) ? JSON.parse(source.example) : source.example;
			}
		}
		target.definition = definition;
	}
	
	static importHeaders(object:any) {
		const headers: Header[] = [];
		
		if (object.hasOwnProperty('headers')) {
			const parameterConverter = new ParameterConverter(this.model, this.annotationPrefix, this.def, '');
			for (const id in object.headers) {
				if (!object.headers.hasOwnProperty(id)) continue;
				
				const headerDef = object.headers[id];
				const hasParams: boolean = RamlMethodConverter.hasParams(headerDef);
				const parameter: Parameter = parameterConverter._import(headerDef);
				const header = new Header();
				_.assign(header, parameter);
				header._in = 'header';
				if (hasParams) header.hasParams = true;
				headers.push(header);
			}
		}
		
		return headers;
	}
	
	static importRequired(source:any, target:any, isRaml08Version:boolean) {
		target.required = source.hasOwnProperty('required') ? source.required : !isRaml08Version;
	}
	
	static importExamples(source:any, target:Definition) {
		let example: any = {};
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
	
	static hasParams(object:any) {
		let hasParams: boolean = false;
		const regex = /\<<([^)]+)\>>/;
		for (const id in object) {
			const value = object[id];
			if ((typeof value === 'string' && value.match(regex)) ||
				(typeof value === 'number' && isNaN(value))) {
				return true;
			} else if (typeof value === 'object') {
				hasParams = RamlMethodConverter.hasParams(value);
			}
		}
		
		return hasParams;
	}
	
}

module.exports = RamlMethodConverter;
