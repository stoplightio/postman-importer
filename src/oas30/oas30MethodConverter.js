// @flow
const _ = require('lodash');

const ConverterModel = require('oas-raml-converter-model');
const Converter = require('../converters/converter');
const Root = ConverterModel.Root;
const Method = ConverterModel.Method;
const Response = ConverterModel.Response;
const Body = ConverterModel.Body;
const Header = ConverterModel.Header;
const Definition = ConverterModel.Definition;
const Parameter = ConverterModel.Parameter;
// const MediaType = ConverterModel.mediaType');
const SecurityRequirement = ConverterModel.SecurityRequirement;

const ParameterConverter = require('../common/parameterConverter');
const helper = require('../helpers/converter');
const stringsHelper = require('../utils/strings');

const Oas30RootConverter = require('./oas30RootConverter');
const Oas30DefinitionConverter = require('./oas30DefinitionConverter');

const { Operation, Reference, RequestBody } = require('./oas30Types');
const OasResponse = require('./oas30Types').Response;
const OasParameter = require('./oas30Types').Parameter;
const OasMediaType = require('./oas30Types').MediaType;
const OasHeader = require('./oas30Types').Header;

import type { Paths, Schema } from './oas30Types';

class Oas30MethodConverter extends Converter {

	constructor(model: Root, dereferencedAPI: any, resourcePath: ?string, def: any) {
		super(model, '', def);
		this.dereferencedAPI = dereferencedAPI;
		this.resourcePath = resourcePath;
	}

	export(models: Method[]): Paths {
		const result = {};
		if (_.isEmpty(models)) return result;

		for (let i = 0; i < models.length; i++) {
			const model: Method = models[i];
			result[model.method] = this._export(model);
		}

		return result;
	}

	_export(model: Method): Operation {
		const operation: Operation = new Operation();
		operation.description = model.description;
		operation.tags = model.tags;

		const definitionConverter = new Oas30DefinitionConverter(this.model, this.annotationPrefix, this.def);

		operation.operationId = model.name;
		if (operation.operationId == null) operation.operationId = stringsHelper.computeOperationId(model.method, model.path);

		if (model.responses != null) {
			const responsesModel: Response[] = model.responses;
			if (Array.isArray(responsesModel) && !_.isEmpty(responsesModel)) {
				const responses = {};

				if (responsesModel.length === 0) {
					responses.default = new OasResponse('');
				}

				for (let i = 0; i < responsesModel.length; i++) {
					const value: Response = responsesModel[i];

					if (value.httpStatusCode != null) {
						if (value.reference != null) {
							const response = new Reference(value.reference);
							responses[value.httpStatusCode] = response;
						} else {
							const response = new OasResponse(value.description || '');

							if (value.headers != null) {
								const headers: Header[] = value.headers;
								if (Array.isArray(headers) && headers.length > 0) {
									const parameterConverter = new ParameterConverter(this.model, this.annotationPrefix, this.def, '');
									const result: { [string]: OasHeader } = parameterConverter.export(headers, false);

									for (let j = 0; j < headers.length; j++) {
										const modelHeader: Header = headers[j];
										const header: OasHeader = result[modelHeader.name];
										header.schema = header.schema || {};
										if (header.type != null && typeof header.type === 'string') {
											// $ExpectError sorry, but I don't really know how to fix it and it works as intended
											header.schema.type = header.type;
											// $ExpectError sorry, but I don't really know how to fix it and it works as intended
											delete header.type;
										}
										if (header.schema != null && header.schema.type != null) {
											const definition: ?Definition = modelHeader.definition;
											if (definition != null && header.schema != null) {
												Oas30DefinitionConverter._convertFromInternalType(definitionConverter._export(definition));
												// $ExpectError sorry, but I don't really know how to fix it and it works as intended
												if (definition.type != null) header.schema.type = definition.type;
												// $ExpectError sorry, but I don't really know how to fix it and it works as intended
												if (definition.format != null) header.schema.format = definition.format;
											}
											// $ExpectError sorry, but I don't really know how to fix it and it works as intended
											if (header.schema.type === 'array' && header.schema.items == null) header.schema.items = { type: 'string' };
										}
										if (header.example != null) delete header.example;
										if (header.schema.required != null) delete header.required;
										if (header.repeat != null) delete header.repeat;
									}
									if (!_.isEmpty(result)) response.headers = result;
								}
							}

							if (value.bodies != null) {
								const bodies: Body[] = value.bodies;
								if (Array.isArray(bodies) && bodies.length > 0) {
									for (let j = 0; j < bodies.length; j++) {
										const val: Body = bodies[j];
										const media = new OasMediaType();

										response.description = val.description != null && _.isEmpty(response.description) ? val.description : response.description;

										const definition: ?Definition = val.definition;
										let schema = {};
										if (definition != null) {
											schema = definitionConverter._export(definition);
											if (definition.internalType != null && definition.internalType === 'file') schema.type = 'file';
											if (definition.internalType == null && definition.type == null && schema.type != null) delete schema.type;
											if (schema.required != null && schema.required === true) delete schema.required;
											if (schema.$ref != null) {
												media.example = schema.example;
												delete schema.example;
												schema = { $ref: schema.$ref };
											}
										}

										Oas30RootConverter.exportAnnotations(val, schema);


										media.schema = schema;

										if (!_.isEmpty(schema)) {
											response.content = {};
											response.content[val.mimeType || '*/*'] = media;
										}

										// if (!_.isEmpty(schema) && !response.schema) {
										// 	response.schema = schema;
										// } else if (response.schema && response.schema.$ref != null) response.schema = { type: 'object' };
									}
								}
							}

							Oas30RootConverter.exportAnnotations(value, response);
							if (value.hasParams != null) response.hasParams = value.hasParams;
							responses[value.httpStatusCode || 'default'] = response;
						}
					}
				}

				operation.responses = responses;
			}
		} else {
			operation.responses = {
				default: new OasResponse(''),
			};
		}

		let parameters: Array<OasParameter | Reference> = Oas30MethodConverter.exportHeaders(model, definitionConverter);

		if (model.bodies != null) {
			const bodies: Body[] = model.bodies;
			if (Array.isArray(bodies)) {
				const content = {};
				let required = false;

				for (let i = 0; i < bodies.length; i++) {
					const body: Body = bodies[i];
					const media = new OasMediaType();

					const schema: Schema = definitionConverter._export(body.definition);

					if(schema.example != null) {
						media.example = schema.example;
						delete schema.example;
					}

					media.schema = schema;
					content[body.mimeType || '*/*'] = media;

					if (body.required) required = true;
				}

				const requestBody = new RequestBody(content);

				requestBody.required = required;
				// requestBody.description = body.description;

				operation.requestBody = requestBody;
			}
		}

		if (model.formBodies != null) {
			const formBodies: Body[] = model.formBodies;
			if (Array.isArray(formBodies) && formBodies.length > 0) {
				const content = {};
				let required = false;

				for (let i = 0; i < formBodies.length; i++) {
					const body: Body = formBodies[i];
					const media = new OasMediaType();

					const schema: Schema = definitionConverter._export(body.definition);

					if(schema.example != null) {
						media.example = schema.example;
						delete schema.example;
					}

					media.schema = schema;
					content[body.mimeType || '*/*'] = media;

					if (body.required) required = true;
				}

				operation.requestBody = operation.requestBody != null
					// $ExpectError sorry, but I don't really know how to fix it and it works as intended
					? Object.assign(operation.requestBody, content)
					: new RequestBody(content);

				// $ExpectError sorry, but I don't really know how to fix it and it works as intended
				operation.requestBody.required = operation.requestBody.required || required;
			}
		}

		const queryParameters = Oas30MethodConverter.exportParameters(model, 'parameters', definitionConverter);
		if (!_.isEmpty(queryParameters)) parameters = parameters.concat(queryParameters);

		const queryStrings = Oas30MethodConverter.exportParameters(model, 'queryStrings', definitionConverter);
		if (!_.isEmpty(queryStrings)) parameters = parameters.concat(queryStrings);

		if (!_.isEmpty(parameters)) operation.parameters = parameters;

		if (model.securedBy != null && this.def && this.def.components.securitySchemes) {
			const securedByModel: SecurityRequirement[] = model.securedBy;
			const security = [];
			for (let i = 0; i < securedByModel.length; i++) {
				const securityReq: SecurityRequirement = securedByModel[i];
				if (securityReq.name !== null
						&& Object.keys(this.def.components.securitySchemes).includes(securityReq.name)) {
					security.push({ [securityReq.name]: securityReq.scopes });
				}
			}
			if (!_.isEmpty(security)) {
				operation.security = security;
			}
		}

		Oas30RootConverter.exportAnnotations(model, operation);
		return operation;
	}

	static exportExamples(source: Definition, target: Object, mimeType: string, exampleKey: 'example' | 'examples') {
		switch (exampleKey) {
			case 'example':
				if (source.example != null) {
					if (!target.examples) target.examples = {};
					target.examples[mimeType] = source.example;
					delete source.example;
				}
				break;
			case 'examples':
				if (source.examples != null) {
					if (!target.examples) target.examples = {};
					target.examples[mimeType] = source.examples;
					delete source.examples;
				}
				break;
		}
	}

	static exportRequired(source: any, target: OasParameter) {
		target.required = source.required;
		if (target.required != null && !target.required) {
			delete target.required;
		}
	}

	static exportHeaders(object: Method, converter: any) {
		const headers: Array<OasParameter | Reference> = [];

		if (object.headers != null) {
			const headersModel: Header[] = object.headers;
			if (_.isArray(headersModel) && !_.isEmpty(headersModel)) {
				for (let i = 0; i < headersModel.length; i++) {
					const value: Header = headersModel[i];
					const definition: ?Definition = value.definition;

					let header;
					if (value.reference != null) {
						header = new Reference(value.reference);
					} else {
						if (value.reference != null) {
							headers.push(new Reference(value.reference));
							continue;
						}

						// $ExpectError _in is not precise enough
						header = new OasParameter(definition.name, value._in || 'header');
						if (definition != null) {
							header.description = definition.description;
							delete definition.description;
						}

						const schema: Schema = converter._export(definition);
						if (schema.type == null) schema.type = 'string';
						if (schema.$ref != null) delete schema.$ref;
						if (schema.type === 'array' && schema.items == null) schema.items = { type: 'string' };
						delete schema.required;
						header.schema = schema;

						helper.removePropertiesFromObject(header, ['example']);
						Oas30MethodConverter.exportRequired(value, header);
						Oas30RootConverter.exportAnnotations(value, header);
					}
					headers.push(header);
				}
			}
		}

		return headers;
	}

	static exportParameters(object: Method, paramsType: string, converter: any): Array<OasParameter | Reference> {
		let parameters: Array<OasParameter | Reference> = [];
		if (object.hasOwnProperty(paramsType)) {
			const parametersModel: ?Parameter[] = paramsType === 'parameters' ? object.parameters : object.queryStrings;
			if (_.isArray(parametersModel) && !_.isEmpty(parametersModel) && parametersModel != null) {
				for (let i = 0; i < parametersModel.length; i++) {
					const value: Parameter = parametersModel[i];

					if (value.reference != null) {
						parameters.push(new Reference(value.reference));
						continue;
					}

					const definition: ?Definition = value.definition;
					let parameter;
					if (paramsType === 'queryStrings' && definition != null && definition.properties != null) {
						const queryStrings = Oas30MethodConverter.exportMultipleQueryStrings(value, converter);
						if (!_.isEmpty(queryStrings)) parameters = parameters.concat(queryStrings);
					} else if (definition != null) {
						// $ExpectError _in is not precise enough
						parameter = new OasParameter(definition.name, value._in || 'query');

						const schema = converter._export(definition);
						if (schema.type == null && schema.$ref == null) schema.type = 'string';
						if (schema.type === 'array' && schema.items == null) schema.items = { type: 'string' };
						if (schema.repeat != null) delete schema.repeat;

						if (schema.required != null) {
							parameter.required = schema.required;
							delete schema.required;
						}
						// path vars are always required
						if (value._in === 'path') {
							parameter.required = true;
						}

						if (schema.description != null) {
							parameter.description = schema.description;
							delete schema.description;
						}

						parameter.schema = schema;
						Oas30MethodConverter.exportRequired(value, parameter);
						helper.removePropertiesFromObject(parameter, ['example']);
						Oas30RootConverter.exportAnnotations(value, parameter);
						// if (value.hasParams != null) parameter.hasParams = value.hasParams;
					}
					if (parameter) parameters.push(parameter);
				}
			}
		}

		return parameters;
	}

	static exportMultipleQueryStrings(object: Parameter, converter: any) {
		const definition: ?Definition = object.definition;
		const queryStrings: Array<OasParameter | Reference> = [];
		if (definition != null && definition.properties != null) {
			const properties: Definition[] = definition.properties;
			for (let i = 0; i < properties.length; i++) {
				const value: Definition = properties[i];
				const name: string = value.name;
				// $ExpectError _in is not precise enough
				const parameter = new OasParameter(name, object._in || 'query');
				const schema = converter._export(value);
				if (definition.hasOwnProperty('propsRequired') && definition.propsRequired != null) {
					value.required = definition.propsRequired.indexOf(name) > -1;
				}
				parameter.schema = schema;
				Oas30MethodConverter.exportRequired(value, parameter);
				queryStrings.push(parameter);
			}
		}

		return queryStrings;
	}
}

module.exports = Oas30MethodConverter;
