// @flow
const _ = require('lodash');
const ConverterModel = require('oas-raml-converter-model');
const Root = ConverterModel.Root;
const Method = ConverterModel.Method;
const Response = ConverterModel.Response;
const Parameter = ConverterModel.Parameter;
const Definition = ConverterModel.Definition;
const Body = ConverterModel.Body;
const Header = ConverterModel.Header;
const Item = ConverterModel.Item;
const MediaType = ConverterModel.MediaType;
const Annotation = ConverterModel.Annotation;
const Converter = require('../converters/converter');
const Oas20RootConverter = require('../oas20/oas20RootConverter');
const Oas20DefinitionConverter = require('../oas20/oas20DefinitionConverter');
const Oas20AnnotationConverter = require('../oas20/oas20AnnotationConverter');
const ParameterConverter = require('../common/parameterConverter');
const SecurityRequirement = ConverterModel.SecurityRequirement;
const ExternalDocumentation = ConverterModel.ExternalDocumentation;
const helper = require('../helpers/converter');
const stringsHelper = require('../utils/strings');
const oasHelper = require('../helpers/oas20');

class Oas20MethodConverter extends Converter {

	constructor(model: Root, dereferencedAPI: any, resourcePath: ?string, def: any) {
		super(model, '', def);
		this.dereferencedAPI = dereferencedAPI;
		this.resourcePath = resourcePath;
	}

	export(models: Method[]) {
		const result = {};
		if (_.isEmpty(models)) return result;

		for (let i = 0; i < models.length; i++) {
			const model: Method = models[i];
			result[model.method] = this._export(model);
		}

		return result;
	}

	// exports 1 method definition
	_export(model: Method) {
		const attrIdMap = {
			'protocols': 'schemes',
			'name': 'operationId'
		};
		const attrIdSkip = ['method', 'responses', 'headers', 'bodies', 'formBodies', 'parameters', 'queryStrings', 
			'is', 'path', 'produces', 'consumes', 'securedBy', 'annotations', 'includePath'];
		const oasDef = Oas20MethodConverter.createOasDef(model, attrIdMap, attrIdSkip);
		const definitionConverter = new Oas20DefinitionConverter(this.model, this.annotationPrefix, this.def);

		if (!oasDef.hasOwnProperty('operationId')) oasDef.operationId = stringsHelper.computeOperationId(model.method, model.path);

		if (model.hasOwnProperty('responses') && model.responses != null) {
			const responsesModel: Response[] = model.responses;
			if (_.isArray(responsesModel) && !_.isEmpty(responsesModel)) {
				const responses = {};
				let produces: string[] = [];
				if (model.hasOwnProperty('produces') && model.produces != null) produces = model.produces;
				for (let i = 0; i < responsesModel.length; i++) {
					const value: Response = responsesModel[i];
					if (value.hasOwnProperty('httpStatusCode')) {
						const response = {};
						if (value.hasOwnProperty('reference')) {
							response['$ref'] = value.reference;
							if (value.hasOwnProperty('bodies') && value.bodies && !_.isEmpty(value.bodies)) {
								const bodies: Body[] = value.bodies;
								const mimeType: ?string = bodies[0].mimeType;
								if (mimeType != null && !produces.includes(mimeType)) produces.push(mimeType);
							}
						} else {
							response.description = value.hasOwnProperty('description') && value.description != null ? value.description : '';
							if (value.hasOwnProperty('headers') && value.headers) {
								const headers: Header[] = value.headers;
								if (_.isArray(headers) && !_.isEmpty(headers)) {
									const parameterConverter = new ParameterConverter(this.model, this.annotationPrefix, this.def, '');
									const result = parameterConverter.export(headers);
									for (let j = 0; j < headers.length; j++) {
										const modelHeader: Header = headers[j];
										const header = result[modelHeader.name];
										if (header.hasOwnProperty('type')) {
											const definition: ?Definition = modelHeader.definition;
											if (definition != null) {
												Oas20DefinitionConverter._convertFromInternalType(definition);
												if (definition.hasOwnProperty('type')) header.type = definition.type;
												if (definition.hasOwnProperty('format')) header.format = definition.format;
											}
											if (header.type === 'array' && !header.hasOwnProperty('items')) header.items = {type: 'string'};
										}
										if (header.hasOwnProperty('example')) delete header.example;
										if (header.hasOwnProperty('required')) delete header.required;
										if (header.hasOwnProperty('repeat')) delete header.repeat;
									}
									if (!_.isEmpty(result)) response.headers = result;
								}
							}
							if (value.hasOwnProperty('bodies') && value.bodies) {
								const bodies: Body[] = value.bodies;
								if (_.isArray(bodies) && !_.isEmpty(bodies)) {
									let schema = {};
									for (let j = 0; j < bodies.length; j++) {
										const val: Body = bodies[j];
										if (val.mimeType && !produces.includes(val.mimeType)) produces.push(val.mimeType);
										response.description = val.hasOwnProperty('description') && _.isEmpty(response.description) ? val.description : response.description;
										const definition: ?Definition = val.definition;
										if (definition != null) {

											Oas20MethodConverter.exportExamples(definition, response, val.mimeType, 'examples');
											schema = definitionConverter._export(definition);
											if (definition.hasOwnProperty('internalType') && definition.internalType === 'file') schema.type = 'file';
											if (!definition.hasOwnProperty('internalType') && !definition.hasOwnProperty('type') && schema.hasOwnProperty('type')) delete schema.type;
											if (schema.hasOwnProperty('required') && schema.required === true) delete schema.required;
											if (schema.hasOwnProperty('$ref')) {
												Oas20MethodConverter.exportExamples(schema, response, val.mimeType, 'example');
												schema = {$ref: schema.$ref};
											}
											Oas20RootConverter.exportAnnotations(val, schema);
											if (!_.isEmpty(schema) && !response.schema) response.schema = schema;
											else if (response.schema && response.schema.hasOwnProperty('$ref')) response.schema = {type: 'object'};
										}
									}
								}
							}
						}
						Oas20RootConverter.exportAnnotations(value, response);
						if (value.hasOwnProperty('hasParams')) response.hasParams = value.hasParams;
						const httpStatusCode: ?string = value.httpStatusCode;
						if (httpStatusCode) responses[httpStatusCode] = response;
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

		let consumes: ?string[] = [];
		if (model.hasOwnProperty('consumes')) consumes = model.consumes;
		if (model.hasOwnProperty('bodies') && model.bodies != null) {
			const bodies: Body[] = model.bodies;
			if (_.isArray(bodies) && !_.isEmpty(bodies)) {
				const value: Body = bodies[0];
				const definition: ?Definition = value.definition;
				const parameter: any = {};
				parameter.schema = Object.assign({}, definitionConverter._export(definition));
				parameter.in = 'body';
				parameter.name = 'body';
				if (value.hasOwnProperty('description')) parameter.description = value.description;
				if (bodies.length > 1) parameter.schema = {type: 'object'};
				if (!parameter.schema.type && !parameter.schema.$ref) {
					if (parameter.schema.hasOwnProperty('properties'))
						parameter.schema.type = 'object';
					else
						parameter.schema.type = 'string';
				}
				Oas20MethodConverter.exportRequired(value, parameter);
				if (definition != null && definition.hasOwnProperty('example') && !parameter.schema.hasOwnProperty('example'))
					parameter.schema.example = definition.example;
				Oas20RootConverter.exportAnnotations(value, parameter);
				if (value.hasOwnProperty('hasParams')) parameter.hasParams = value.hasParams;
				parameters.push(parameter);

				if (consumes != null) {
					for (let i = 0; i < bodies.length; i++) {
						const body: Body = bodies[i];
						if (body.mimeType && !consumes.includes(body.mimeType)) consumes.push(body.mimeType);
					}
				}
			}
		}

		if (model.hasOwnProperty('formBodies') && model.formBodies != null) {
			const formBodies: Body[] = model.formBodies;
			if (_.isArray(formBodies) && !_.isEmpty(formBodies)) {
				for (let i = 0; i < formBodies.length; i++) {
					const body: Body = formBodies[i];
					if (body.mimeType && consumes != null && !consumes.includes(body.mimeType)) consumes.push(body.mimeType);
					const definition: ?Definition = body.definition;
					if (definition != null) {

						if (definition.internalType === 'file' && consumes != null && !consumes.includes('multipart/form-data')) consumes.push('multipart/form-data');
						let input: Definition[] = [];
						const propertiesRequired = definition.propsRequired ? definition.propsRequired : [];
						let hasProperties;
						if (definition.hasOwnProperty('properties') && definition.properties != null) {
							input = definition.properties;
							hasProperties = true;
						} else {
							hasProperties = false;
							const bodyDef: Definition = definition;
							if (body.hasOwnProperty('required')) bodyDef.required = body.required;
							input = [bodyDef];
						}
						for (let i = 0; i < input.length; i++) {
							const param: Definition = input[i];
							const parameter = {};
							parameter.in = 'formData';
							parameter.name = param.name;
							if (param.internalType) {
								if (param.internalType === 'file') {
									param.type = 'file';
									delete param.internalType;
								} else if (param.internalType === 'datetime') {
									param.type = 'datetime';
									delete param.internalType;
								}
								else Oas20DefinitionConverter._convertFromInternalType(param);
							}
							parameter.type = param.type;
							if (!parameter.type) parameter.type = 'string';
							if (param.hasOwnProperty('description')) parameter.description = param.description;
							if (hasProperties) param.required = propertiesRequired.includes(param.name);
							if (parameter.type === 'array' && !parameter.hasOwnProperty('items')) parameter.items = {type: 'string'};
							Oas20MethodConverter.exportRequired(param, parameter);
							Oas20RootConverter.exportAnnotations(param, parameter);
							parameters.push(parameter);
						}
					}
				}
				if (consumes != null && _.isEmpty(_.intersection(consumes, helper.getValidFormDataMimeTypes))) consumes.push('multipart/form-data');
			}
		}
		if (!_.isEmpty(consumes)) oasDef.consumes = consumes;

		const queryParameters = Oas20MethodConverter.exportParameters(model, 'parameters', definitionConverter);
		if (!_.isEmpty(queryParameters)) parameters = parameters.concat(queryParameters);

		const queryStrings = Oas20MethodConverter.exportParameters(model, 'queryStrings', definitionConverter);
		if (!_.isEmpty(queryStrings)) parameters = parameters.concat(queryStrings);

		if (!_.isEmpty(parameters)) oasDef.parameters = parameters;

		if (model.hasOwnProperty('securedBy') && model.securedBy != null && this.def && this.def.securityDefinitions) {
			const securedByModel: SecurityRequirement[] = model.securedBy;
			const security = [];
			for (let i = 0; i < securedByModel.length; i++) {
				const securityReq: SecurityRequirement = securedByModel[i];
				if (securityReq.name !== null && Object.keys(this.def.securityDefinitions).includes(securityReq.name))
					security.push({[securityReq.name]: securityReq.scopes});
			}
			if (!_.isEmpty(security)) {
				oasDef['security'] = security;
			}
		}

		Oas20RootConverter.exportAnnotations(model, oasDef);

		if (this.model && this.model.hasOwnProperty('mediaType')) {
			const mediaType: MediaType = this.model.mediaType;
			if (mediaType.hasOwnProperty('consumes') && oasDef.hasOwnProperty('consumes')) {
				const consumes: ?string[] = mediaType.consumes;
				if (consumes != null && oasDef.consumes != null) {
					oasDef.consumes = oasDef.consumes.filter(function (consume) {
						return !consumes.includes(consume);
					});
				}
				if (_.isEmpty(oasDef.consumes)) delete oasDef.consumes;
			}
			if (mediaType.hasOwnProperty('produces') && oasDef.hasOwnProperty('produces')) {
				const produces: ?string[] = mediaType.produces;
				if (produces != null) {
					oasDef.produces = oasDef.produces.filter(function (produce) {
						return !produces.includes(produce);
					});
				}
				if (_.isEmpty(oasDef.produces)) delete oasDef.produces;
			}
		}
		return oasDef;
	}

	static exportExamples(source: Definition, target: any, mimeType: ?string, exampleKey: string) {
		switch (exampleKey) {
			case 'example':
				if (source.hasOwnProperty(exampleKey)) {
					if (!target.examples) target.examples = {};
					if (mimeType != null) target.examples[mimeType] = source.example;
					delete source.example;
				}
				break;
			case 'examples':
				if (source.hasOwnProperty(exampleKey)) {
					if (!target.examples) target.examples = {};
					if (mimeType != null) target.examples[mimeType] = source.examples;
					delete source.examples;
				}
				break;
		}
	}

	static exportRequired(source: any, target: any) {
		target.required = source.required;
		if (target.hasOwnProperty('required') && !target.required)
			delete target.required;
	}

	static exportHeaders(object: Method, converter: any) {
		const headers = [];

		if (object.hasOwnProperty('headers') && object.headers != null) {
			const headersModel: Header[] = object.headers;
			if (_.isArray(headersModel) && !_.isEmpty(headersModel)) {
				for (let i = 0; i < headersModel.length; i++) {
					const value: Header = headersModel[i];
					const definition: ?Definition = value.definition;
					let header;
					if (value.hasOwnProperty('reference')) {
						header = {$ref: value.reference};
					} else {
						header = Object.assign({}, converter._export(definition));
						header.in = value._in;
						if (definition != null) header.name = definition.name;
						if (!header.type) header.type = 'string';
						if (header.$ref) delete header.$ref;
						if (header.type === 'array' && !header.hasOwnProperty('items')) header.items = {type: 'string'};
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

	static exportParameters(object: Method, paramsType: string, converter: any) {
		let parameters = [];
		if (object.hasOwnProperty(paramsType)) {
			const parametersModel: ?Parameter[] = paramsType === 'parameters' ? object.parameters : object.queryStrings;
			if (_.isArray(parametersModel) && !_.isEmpty(parametersModel) && parametersModel != null) {
				for (let i = 0; i < parametersModel.length; i++) {
					const value: Parameter = parametersModel[i];
					const definition: ?Definition = value.definition;
					let parameter;
					if (value.hasOwnProperty('reference')) {
						parameter = {$ref: value.reference};
					} else if (paramsType === 'queryStrings' && definition != null && definition.hasOwnProperty('properties')) {
						const queryStrings = Oas20MethodConverter.exportMultipleQueryStrings(value, converter);
						if (!_.isEmpty(queryStrings)) parameters = parameters.concat(queryStrings);
					} else if (definition != null) {
						parameter = Object.assign({}, converter._export(definition));
						if (parameter.hasOwnProperty('items') && parameter.items.hasOwnProperty('$ref')) {
							parameter.items.type = 'string';
							delete parameter.items.$ref;
						}
						parameter.in = value._in;
						parameter.name = definition.name;
						Oas20MethodConverter.exportRequired(value, parameter);
						if (!parameter.type) parameter.type = 'string';
						if (parameter.$ref) delete parameter.$ref;
						if (parameter.type === 'array' && !parameter.hasOwnProperty('items')) parameter.items = {type: 'string'};
						if (parameter.hasOwnProperty('repeat')) delete parameter.repeat;
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

	static exportMultipleQueryStrings(object: Parameter, converter: any) {
		const definition: ?Definition = object.definition;
		const queryStrings = [];
		if (definition != null && definition.properties != null) {
			const properties: Definition[] = definition.properties;
			for (let i = 0; i < properties.length; i++) {
				const value: Definition = properties[i];
				const name: string = value.name;
				const parameter = converter._export(value);
				if (definition.hasOwnProperty('propsRequired') && definition.propsRequired != null) {
					value.required = definition.propsRequired.indexOf(name) > -1;
				}
				parameter.in = object._in;
				parameter.name = name;
				Oas20MethodConverter.exportRequired(value, parameter);
				queryStrings.push(parameter);
			}
		}

		return queryStrings;
	}

	static createOasDef(method: Method, attrIdMap, attrIdSkip) {
		const result = {};

		_.assign(result, method);
		attrIdSkip.map(id => {
			delete result[id];
		});
		_.keys(attrIdMap).map(id => {
			const value = result[id];
			if (value != null) {
				result[attrIdMap[id]] = result[id];
				delete result[id];
			}
		});

		return result;
	}

	static createMethod(oasDef, attrIdMap, attrIdSkip, annotationPrefix) {
		const object = {};

		_.entries(oasDef).map(([key, value]) => {
			if (attrIdSkip.indexOf(key) < 0 && !key.startsWith('x-') && !key.startsWith(annotationPrefix)) {
				object[attrIdMap.hasOwnProperty(key) ? attrIdMap[key] : key] = value;
			}
		});
		const result = new Method();
		_.assign(result, object);

		return result;
	}

	import(oasDefs: any) {
		const validMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];
		let result: Method[] = [];
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

			const oasDef = oasDefs[id].hasOwnProperty('$ref') ? this.dereferencedAPI[id] : oasDefs[id];
			this.currentMethod = id;
			const parametersDef = oasDef.parameters ? oasDef.parameters.concat(parameters) : parameters;
			if (!_.isEmpty(parametersDef)) oasDef.parameters = parametersDef;
			this.method = id;
			const method: Method = this._import(oasDef);
			method.method = id;
			result.push(method);
		}

		return result;
	}

	// imports 1 method definition
	_import(oasDef: any) {
		const attrIdMap = {
			'operationId': 'name',
			'schemes': 'protocols'
		};

		const attrIdSkip = ['responses', 'description', 'parameters', 'security', 'externalDocs'];
		const model = Oas20MethodConverter.createMethod(oasDef, attrIdMap, attrIdSkip, oasHelper.getAnnotationPrefix);
		const definitionConverter = new Oas20DefinitionConverter(this.model, this.annotationPrefix, this.def);

		if (oasDef.hasOwnProperty('security')) {
			const result: SecurityRequirement[] = [];
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
				const responses: Response[] = [];
				for (const id in oasDef.responses) {
					if (!oasDef.responses.hasOwnProperty(id)) continue;

					const value = oasDef.responses[id];
					const response = new Response();
					response.httpStatusCode = id;
					if (value.hasOwnProperty('$ref') && this.model.responses) {
						const reference: string = stringsHelper.computeResourceDisplayName(value.$ref);
						const modelResponses: Response[] = this.model.responses.filter(modelResponse => {
							return modelResponse.name === reference;
						});
						if (!_.isEmpty(modelResponses)) {
							const def: Response = modelResponses[0];
							if (def.hasOwnProperty('description')) response.description = def.description;
							if (def.hasOwnProperty('headers')) response.headers = def.headers;
							if (def.hasOwnProperty('bodies')) response.bodies = def.bodies;
						}
						response.globalResponseDefinition = reference;
					} else {
						if (value.hasOwnProperty('description')) response.description = value.description;
						if (value.hasOwnProperty('headers')) {
							const headers: Header[] = [];
							const definitionConverter = new Oas20DefinitionConverter(this.model, this.annotationPrefix, this.def);
							for (const index in value.headers) {
								const header = new Header();
								header.name = index;
								const definition: Definition = definitionConverter._import(value.headers[index]);
								header.definition = definition;
								headers.push(header);
							}
							response.headers = headers;
						}
						const body = new Body();
						if (value.hasOwnProperty('schema')) {
							const annotationConverter = new Oas20AnnotationConverter(this.model);
							const annotations: Annotation[] = annotationConverter._import(value.schema);
							const definition: Definition = definitionConverter._import(value.schema);
							if (!_.isEmpty(annotations)) definition.annotations = annotations;
							if (value.schema.hasOwnProperty('example')) Oas20MethodConverter.importExamples(value.schema, definition, 'example');
							body.definition = definition;
						}
						if (value.hasOwnProperty('examples') && !_.isEmpty(value.examples)) {
							const examples = value.examples;
							for (const index in examples) {
								if (!examples.hasOwnProperty(index) || examples[index] == null) continue;
								if (!body.mimeType) body.mimeType = index;
								const val: any = examples[index];
								const result = new Body();
								const definition = new Definition();
								definition.examples = val;
								Oas20MethodConverter.importExamples({examples: val}, definition, 'examples');
								result.definition = definition;
								if (!body.definition) body.definition = new Definition();
								_.assign(body.definition, result.definition);
							}
						}
						const bodies: Body[] = _.isEmpty(body) ? [] : [body];
						response.bodies = bodies;
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
		if (oasDef.hasOwnProperty('parameters')) {
			if (_.isArray(oasDef.parameters) && !_.isEmpty(oasDef.parameters)) {
				const headers: Header[] = [];
				const bodies: Body[] = [];
				const formBodies: Body[] = [];
				const parameters: Parameter[] = [];
				const is: Item[] = [];
				for (const index in oasDef.parameters) {
					if (!oasDef.parameters.hasOwnProperty(index)) continue;

					const isExternal = oasHelper.isFilePath(oasDef.parameters[index]);
					let dereferencedParam = (this.dereferencedAPI) ? (this.currentMethod ? (this.dereferencedAPI[this.currentMethod].parameters ? this.dereferencedAPI[this.currentMethod].parameters[index] : null) : this.dereferencedAPI) : null;
					const isInPath = this.resourcePath && dereferencedParam && dereferencedParam.in === 'path';
					const val = (isExternal || isInPath) && dereferencedParam ? dereferencedParam : oasDef.parameters[index];
					if (val.hasOwnProperty('$ref') && !isInPath) {
						const regex = /(trait:)(.*)(:.*)/;
						let traitName = stringsHelper.computeResourceDisplayName(val.$ref);
						const match = traitName.match(regex);
						if (match) traitName = match[2];
						if (!is.map(object => object.name).includes(traitName)) {
							const item = new Item();
							item.name = traitName;
							is.push(item);
						}
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
							const header = new Header();
							header._in = val.in;
							header.name = val.name;
							if (val.hasOwnProperty('description')) header.description = val.description;
							Oas20RootConverter.importAnnotations(val, header, this.model);
							const definition: Definition = definitionConverter._import(val);
							header.definition = definition;
							Oas20MethodConverter.importRequired(val, header);
							headers.push(header);
						} else if (val.hasOwnProperty('in') && val.in === 'body') {
							const body = new Body();
							if (val.hasOwnProperty('description')) body.description = val.description;
							if (val.hasOwnProperty('name')) body.name = val.name;
							Oas20RootConverter.importAnnotations(val, body, this.model);
							const definition: Definition = definitionConverter._import(val.schema);
							body.definition = definition;
							Oas20MethodConverter.importRequired(val, body);
							bodies.push(body);
						} else if (val.hasOwnProperty('in') && val.in === 'formData') {
							const body = new Body();
							const definition: Definition = definitionConverter._import(val);
							body.definition = definition;
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
							const definition: Definition = definitionConverter._import(val);
							parameter.definition = definition;
							Oas20MethodConverter.importRequired(val, parameter);
							if (val.in === 'path' && this.model[this.resourcePath] && dereferencedParam && this.resourcePath.split('/').pop().includes(dereferencedParam.name)) {
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

	static importRequired(source: any, target: any) {
		target.required = source.hasOwnProperty('required') ? source.required : false;
	}

	static importExamples(source: any, target: Definition, property: string) {
		let isJson: boolean = false;
		try {
			switch (property) {
				case 'example' : {
					const example = JSON.parse(source.example);
					if (typeof source.example === 'string') {
						target.example = example;
					} else if (source.example === null) {
						delete target.example;
					}
					break;
				}
				case 'examples': {
					isJson = _.startsWith(source.examples, '{');
					const examples = JSON.parse(source.examples);
					if (typeof source.examples === 'string') {
						target.examples = examples;
					} else if (source.examples === null) {
						delete target.examples;
					}
					break;
				}
			}
		} catch (e) {
			if (isJson) {
				target.invalidJsonExample = true;
			}
		}
	}
}

module.exports = Oas20MethodConverter;
