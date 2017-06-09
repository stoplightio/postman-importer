const _ = require('lodash'),
	Exporter = require('./exporter'),
	ramlHelper = require('../helpers/raml'),
	stringHelper = require('../utils/strings'),
	jsonHelper = require('../utils/json'),
	YAML = require('js-yaml');

class RAMLDefinition {
	constructor(title, env) {
		this.title = title;
		//TODO anyway to know version?
		this.version = env.Version;
		const baseUri = env.Host + env.BasePath;
		if (baseUri) {
			this.baseUri = baseUri;
		}
		this.mediaType = env.DefaultResponseType || '';
		
		const protocols = RAMLExporter.mapProtocols(env.Protocols);
		if (!_.isEmpty(protocols)) {
			this.protocols = protocols;
		}
	}
	
	addMethod(resource, methodURIs, methodKey, method, pathParamsRef) {
		if (!methodURIs) return;
		
		if (methodURIs.length <= 0) {
			//reach the leaf of tree
			//TODO optional: check same method existence
			if (!resource.uriParameters) {
				resource.uriParameters = {};
			}
			for (const attrname in method.uriParameters) {
				if (!method.uriParameters.hasOwnProperty(attrname)) continue;
				//uri not available, so check with displayName, which is same
				if (resource.displayName) {
					const isURIParamExist = resource.displayName.split(attrname).length - 1;
					if (isURIParamExist) {
						resource.uriParameters[attrname] = method.uriParameters[attrname];
					}
				}
			}
			
			delete method.uriParameters;
			if (_.isEmpty(resource.uriParameters)) delete resource.uriParameters;
			
			resource[methodKey] = method;
			if (!_.isEmpty(pathParamsRef)) {
				const is = [];
				for (const key in pathParamsRef) {
					if (!pathParamsRef.hasOwnProperty(key)) continue;
					is.push(_.camelCase(pathParamsRef[key]));
				}
				resource.is = is;
			}
		}
		else {
			const currentURI = '/' + methodURIs[0];
			if (!resource[currentURI]) {
				resource[currentURI] = {};
				if (!_.isEmpty(methodURIs[0])) {
					resource[currentURI].displayName = methodURIs[0];
				}
				//TODO uriParams?!?
			}
			methodURIs.splice(0, 1);
			this.addMethod(resource[currentURI], methodURIs, methodKey, method, pathParamsRef);
		}
	}
}

class RAMLExporter extends Exporter {
	constructor() {
		super();
	}
	
	_mapSecurityScheme(slSecuritySchemes) {
		const ramlSecuritySchemes = {};
		
		if (slSecuritySchemes.hasOwnProperty('oauth2')) {
			for (const index in slSecuritySchemes.oauth2) {
				if (!slSecuritySchemes.oauth2.hasOwnProperty(index)) continue;
				
				const current = slSecuritySchemes.oauth2[index];
				
				const name = current.name || 'oauth2';
				// missing describedBy
				
				ramlSecuritySchemes[name] = {
					type: 'OAuth 2.0',
					settings: {
						authorizationUri: current.authorizationUrl || undefined,
						accessTokenUri: current.tokenUrl || '',
						authorizationGrants: this.mapAuthorizationGrants(current.flow)
					}
				};
				if (current.description) {
					ramlSecuritySchemes[name]['description'] = current.description;
				}
				
				const scopes = [];
				if (current.scopes && !_.isEmpty(current.scopes)) {
					for (const index in current.scopes) {
						if (!current.scopes.hasOwnProperty(index)) continue;
						const scope = current.scopes[index].name;
						scopes.push(scope);
					}
					
					ramlSecuritySchemes[name]['settings']['scopes'] = scopes;
				}
			}
		}
		
		if (slSecuritySchemes.hasOwnProperty('basic')) {
			for (const index in slSecuritySchemes.basic) {
				if (!slSecuritySchemes.basic.hasOwnProperty(index)) continue;
				const current = slSecuritySchemes.basic[index];
				
				const basicName = current.name;
				if (basicName) {
					ramlSecuritySchemes[basicName] = {
						type: 'Basic Authentication',
						description: current.description
					};
				}
			}
		}
		
		if (slSecuritySchemes.hasOwnProperty('apiKey')) {
			// add header auth
			if (!_.isEmpty(slSecuritySchemes.apiKey.headers)) {
				for (const index in slSecuritySchemes.apiKey.headers) {
					if (!slSecuritySchemes.apiKey.headers.hasOwnProperty(index)) continue;
					const current = slSecuritySchemes.apiKey.headers[index];
					const content = {
						headers: {}
					};
					
					content.headers[current.name] = {
						type: 'string'
					};
					
					if (!_.isEmpty(content)) {
						ramlSecuritySchemes[current.externalName || 'apiKey'] = {
							type: this.getApiKeyType(),
							describedBy: content,
							description: current.description
						};
					}
				}
			}
			
			// add query auth
			if (!_.isEmpty(slSecuritySchemes.apiKey.queryString)) {
				for (const index in slSecuritySchemes.apiKey.queryString) {
					if (!slSecuritySchemes.apiKey.queryString.hasOwnProperty(index)) continue;
					const current = slSecuritySchemes.apiKey.queryString[index];
					const content = {
						queryParameters: {}
					};
					
					content.queryParameters[current.name] = {
						type: 'string'
					};
					
					if (!_.isEmpty(content)) {
						ramlSecuritySchemes[current.externalName || 'apiKey'] = {
							type: this.getApiKeyType(),
							describedBy: content,
							description: current.description
						};
					}
				}
			}
		}
		
		return this.mapSecuritySchemes(ramlSecuritySchemes);
	}
	
	static _validateParam(params) {
		const acceptedTypes = ['string', 'number', 'integer', 'date', 'boolean', 'file', 'array', 'datetime'];
		for (const key in params) {
			if (!params.hasOwnProperty(key)) continue;
			const param = params[key];
			for (const prop in param) {
				if (!param.hasOwnProperty(prop)) continue;
				switch (prop) {
					case 'type': {
						const type = params[key].type;
						if (acceptedTypes.indexOf(type) < 0) {
							//not supported type, delete param
							delete params[key];
							continue;
						}
						break;
					}
					case 'enum':
					case 'pattern':
					case 'minLength':
					case 'maxLength':
						if (params[key].type !== 'string') {
							delete params[key][prop];
						}
						break;
					case 'minimum':
					case 'maximum': {
						const typeLowercase = _.toLower(params[key].type);
						if (typeLowercase !== 'integer' && typeLowercase !== 'number') {
							delete params[key][prop];
						}
						break;
					}
					case 'required':
					case 'displayName':
					case 'description':
					case 'example':
					case 'repeat':
					case 'default':
					case 'items':
					case 'format':
					case 'maxItems':
					case 'minItems':
					case 'uniqueItems':
					case 'facets':
					case '(oas-format)':
					case '(oas-allowEmptyValue)':
					case '(oas-collectionFormat)':
					case '(oas-exclusiveMaximum)':
					case '(oas-exclusiveMinimum)':
						break;
					default:
						//not supported types
						if (params[key]) {
							delete params[key][prop];
						}
				}
			}
		}
		
		return params;
	}
	
	_mapRequestBody(bodyData, mimeType, ramlDef) {
		const body = {};
		if (!bodyData.body || mimeType === '') return body;
		
		switch (mimeType) {
			case 'application/json':
				body[mimeType] = this.mapBody(bodyData, mimeType, ramlDef);
				this.convertRequiredFromProperties(body[mimeType]);
				if (bodyData.name) {
					RAMLExporter._createAnnotation(body[mimeType], 'body-name', bodyData.name, ramlDef);
				}
				break;
			case 'multipart/form-data':
			case 'application/x-www-form-urlencoded': {
				const parsedBody = jsonHelper.parse(bodyData.body);
				body[mimeType] = this.mapRequestBodyForm(this.convertRefFromModel(parsedBody, false, null, ramlDef), ramlDef);
				break;
			}
			default:
			//unsuported format
			//TODO
		}
		
		if (bodyData.description) {
			body[mimeType].description = bodyData.description;
		}
		
		return body;
	}
	
	_mapNamedParams(params, ramlDef) {
		if (!params || _.isEmpty(params.properties)) return;
		
		const newParams = {};
		const convertedParams = this.convertRefFromModel(params.properties, false, null, ramlDef);
		for (const key in convertedParams) {
			if (!convertedParams.hasOwnProperty(key)) continue;
			newParams[key] = ramlHelper.setParameterFields(convertedParams[key], {});
			if (params.required && params.required.indexOf(key) > -1) {
				newParams[key].required = true;
			}
			newParams[key] = jsonHelper.orderByKeys(newParams[key], ['type', 'description']);
		}
		return RAMLExporter._validateParam(newParams);
	}
	
	_mapResponseBody(responseData, mimeType, ramlDef) {
		const responses = {};
		
		for (const i in responseData) {
			if (!responseData.hasOwnProperty(i)) continue;
			
			const resBody = responseData[i];
			if (!_.isEmpty(resBody.codes)) {
				const code = resBody.codes[0];
				if (parseInt(code) == 'NaN' || _.startsWith(code, 'x-')) {
					continue;
				}
				
				responses[code] = {};
				
				const type = mimeType;
				const body = this.mapBody(resBody, type, ramlDef);
				this.convertRequiredFromProperties(body);
				if (!_.isEmpty(body)) {
					responses[code].body = {};
					if (type) {
						responses[code]['body'][type] = body;
					} else {
						responses[code]['body'] = body;
					}
				}
				
				if (resBody.description) {
					responses[code]['description'] = resBody.description;
				}
				
				if (!jsonHelper.isEmptySchema(resBody.headers)) {
					responses[code].headers = this._mapNamedParams(resBody.headers, ramlDef);
				}
				
				if (resBody.response_id) {
					RAMLExporter._createAnnotation(responses[code], 'global-response-definition', resBody.response_id, ramlDef);
					delete resBody.response_id;
				}
			}
		}
		
		return responses;
	}
	
	_mapURIParams(pathParamData, ramlDef) {
		if (!pathParamData.properties || _.isEmpty(pathParamData.properties)) {
			return;
		}
		
		const pathParams = {};
		for (const key in pathParamData.properties) {
			if (!pathParamData.properties.hasOwnProperty(key)) continue;
			const prop = pathParamData.properties[key];
			RAMLExporter._mapFormats(prop, ramlDef);

			pathParams[key] = ramlHelper.setParameterFields(prop, {});

			RAMLExporter.fixEnumValueFormat(prop);

			if (prop.items) {
				const items = prop.items;
				RAMLExporter._mapFormats(items, ramlDef);
				RAMLExporter.fixEnumValueFormat(items);
				pathParams[key].items = items;
			}
			
			if (prop.format) {
				pathParams[key].format = prop.format;
			}
			
			pathParams[key].type = pathParams[key].type || 'string';
			
			//facets
			for (const id in pathParams[key]) {
				if (!pathParams[key].hasOwnProperty(id)) continue;
				if (id === 'exclusiveMinimum' || id === 'exclusiveMaximum' || id === 'allowEmptyValue' || id === 'collectionFormat') {
					RAMLExporter._createAnnotation(pathParams[key], id, pathParams[key][id], ramlDef);
					delete pathParams[key][id];
				}
			}
		}
		
		return RAMLExporter._validateParam(pathParams);
	}

	static fixEnumValueFormat(object){
		if (object.hasOwnProperty('enum')){
			if (object.type === 'date-only'){
				for (const index in object.enum){
          if (!object.enum.hasOwnProperty(index)) continue;
					let val = object.enum[index];
					if (ramlHelper.getDateOnlyFormat.test(val)){
						val = val.replace(/_/g,"-");
            val = val.replace(new RegExp("/","g"), "-");
            object['enum'][index] = val;
					}
				}
			}
		}
	}
	
	static mapProtocols(protocols) {
		const validProtocols = [];
		for (const i in protocols) {
			if (!protocols.hasOwnProperty(i) || ((_.toLower(protocols[i]) != 'http') && (_.toLower(protocols[i]) != 'https'))) {
				//RAML incompatible formats( 'ws' etc)
				continue;
			}
			validProtocols.push(_.toUpper(protocols[i]));
		}
		return validProtocols;
	}
	
	_mapTextSections(slTexts) {
		const results = [];
		if (!slTexts) return resilts;
		
		for (const i in slTexts) {
			if (!slTexts.hasOwnProperty(i)) continue;
			const text = slTexts[i];
			
			if (text.divider || _.isEmpty(text.name) || _.isEmpty(text.content)) {
				continue;
			}
			
			results.push({
				title: text.name,
				content: text.content
			});
		}
		
		return results;
	}
	
	// from ref=type1 to type=type1
	// from $ref=#/definitions/type1 to type=type1
	// from $ref=definitions/type1 to !include definitions/type1
	convertRefFromModel(object, isTypeDeclaration, insideProperties, ramlDef) {
		RAMLExporter._mapFormats(object, ramlDef);
		for (const id in object) {
			if (object.hasOwnProperty(id)) {
				let val = object[id];
				if (insideProperties)
					val = RAMLExporter.convertSchemaTitles(val, 'property', ramlDef);
				if (id == '$ref' && !insideProperties) {
					if (val.indexOf('#/') == 0) {
						object.type = val.replace('#/definitions/', '');
						//check if object.type has invalid characters.
						object.type = stringHelper.checkAndReplaceInvalidChars(object.type, ramlHelper.getValidCharacters, ramlHelper.getReplacementCharacter);
					} else {
						object.type = '!include ' + val.replace('#/', '#');
					}
					delete object[id];
				} else if (id == 'type' && !insideProperties) {
					if (val === 'null')
						object.type = 'nil';
					else if (typeof val === 'object') {
						for (const key in val) {
							if (!val.hasOwnProperty(key)) continue;
							if (val[key] === 'null') val[key] = 'nil';
						}
					}
				} else if (typeof val === 'string') {
					if (id == 'ref') {
						object.type = val;
						delete object[id];
					} else if (id == 'include') {
						object.type = '!include ' + val;
						delete object[id];
					} else if (id === 'collectionFormat') {
						RAMLExporter._createAnnotation(object, id, object[id], ramlDef);
					}
				} else if (val && (typeof val) === 'object' && (id !== 'facets' || insideProperties)) {
					RAMLExporter._mapFormats(val, ramlDef);
					if (!insideProperties) {
						if (id === 'example' && object.type === undefined)
							object['type'] = typeof val;
						else if (object.hasOwnProperty('items') && object.type !== 'array')
							object['type'] = 'array';
					}
					else if (val.hasOwnProperty('additionalProperties'))
						val.type = 'object';
					if (id === 'readOnly')
						RAMLExporter._createAnnotation(object, id, object[id], ramlDef);

					object[id] = this.convertRefFromModel(val, isTypeDeclaration, id === 'properties' && !insideProperties, ramlDef);
				} else if (id === '$ref') {
					object.type = val.replace('#/definitions/', '');
					delete object[id];
				} else if (id === 'exclusiveMinimum' || id === 'exclusiveMaximum' || id === 'allowEmptyValue' || id === 'collectionFormat') {
					RAMLExporter._createAnnotation(object, id, object[id], ramlDef);
					delete object[id];
				} else if (id === 'readOnly') {
					RAMLExporter._createAnnotation(object, id, object[id], ramlDef);
					delete object[id];
				} else if (!ramlHelper.isNumberType(object.type) && (id === 'maximum' || id === 'minimum')) {
          RAMLExporter._createAnnotation(object, id, object[id], ramlDef);
          delete object[id];
        }
        if (ramlHelper.isNumberType(object.type) && id === 'example') {
					object[id] = _.toNumber(object[id]);
        }
        if (val !== null && val.hasOwnProperty('readOnly') && id !== 'properties') {
					RAMLExporter._createAnnotation(val, 'readOnly', val['readOnly'], ramlDef);
					delete val['readOnly'];
				}
			}
		}
		
		return object;
	}
	
	static _createAnnotation(object, id, value, ramlDef) {
		let definition;
		let found = true;
		switch (id) {
			case 'allowEmptyValue':
				definition = {
					type: 'boolean'
				};
				break;
			
			case 'tags':
				definition = {
					type: 'string[]',
					allowedTargets: 'Method'
				};
				break;
			
			case 'deprecated':
				definition = {
					type: 'boolean',
					allowedTargets: 'Method'
				};
				break;
			
			case 'summary':
				definition = {
					type: 'string',
					allowedTargets: 'Method'
				};
				break;
			
			case 'externalDocs':
				definition = {
					properties: {
						'description?': 'string',
						'url': 'string'
					},
					allowedTargets: ['API', 'Method', 'TypeDeclaration']
				};
				break;
			
			case 'info':
				definition = {
					properties: {
						'termsOfService?': 'string',
						'contact?': {
							properties: {
								'name?': 'string',
								'url?': 'string',
								'email?': 'string'
							}
						},
						'license?': {
							properties: {
								'name?': 'string',
								'url?': 'string'
							}
						}
					},
					allowedTargets: 'API'
				};
				break;
			
			case 'schema-title':
				definition = {
					type: 'string',
					allowedTargets: 'TypeDeclaration'
				};
				break;
			
			case 'property-title':
				definition = {
					type: 'string',
					allowedTargets: 'TypeDeclaration'
				};
				break;
			
			case 'body-name':
				definition = {
					type: 'string',
					allowedTargets: 'TypeDeclaration'
				};
				break;
			
			case 'responses-default':
				definition = {
					type: 'any',
					allowedTargets: 'Method'
				};
				break;
			
			case 'global-response-definition':
				definition = {
					type: 'any',
					allowedTargets: 'Response'
				};
				break;
			
			case 'definition-name':
				definition = {
					type: 'string',
					allowedTargets: 'TypeDeclaration'
				};
				break;
			
			case 'collectionFormat':
				definition = {
					type: 'string'
				};
				break;
			
			case 'format':
				definition = {
					type: 'string',
					allowedTargets: 'TypeDeclaration'
				};
				break;
			
			case 'readOnly':
				definition = {
					type: 'boolean',
					allowedTargets: 'TypeDeclaration'
				};
				break;
			
			case 'responses':
				definition = 'any';
				break;
			
			case 'exclusiveMaximum':
			case 'exclusiveMinimum':
				definition = {
					type: 'boolean'
				};
				break;

			case 'maximum':
			case 'minimum':
				definition = {
          allowedTargets: 'TypeDeclaration',
          type: 'number'
				};
				break;

			default:
				found = false;
				break;
		}
		
		if (!found) return false;
		
		if (!ramlDef.annotationTypes) {
			ramlDef.annotationTypes = {};
		}
		
		const annotationDefId = 'oas-' + id;
		if (!ramlDef.annotationTypes.hasOwnProperty(annotationDefId)) {
			ramlDef.annotationTypes[annotationDefId] = definition;
		}
		
		const annotationUsageId = '(' + annotationDefId + ')';
		if (object.hasOwnProperty(annotationUsageId))
			_.merge(object[annotationUsageId], value);
		else
			object[annotationUsageId] = value;
		
		return true;
	}
	
	static _mapFormats(object, ramlDef) {
    const intValidFormats = ['int', 'int8', 'int16', 'int32', 'int64'];
		if (object && !object.hasOwnProperty('type') && object.format == 'string') {
			object['type'] = 'string';
			delete object.format;
		} else if (object && object.type == 'string'){
			if (object.format == 'byte' || object.format == 'binary' || object.format == 'password' || object.format == 'uuid') {
				RAMLExporter._createAnnotation(object, 'format', object.format, ramlDef);
				delete object.format;
			} else if (object.format == 'date') {
				object['type'] = 'date-only';
				delete object.format;
			} else if (object.format == 'date-time') {
				object['type'] = 'datetime';
				object['format'] = 'rfc3339';
			}
			else {
				if (object.format && ramlHelper.getValidFormat.indexOf(object.format) < 0) {
					RAMLExporter._createAnnotation(object, 'format', object.format, ramlDef);
					delete object.format;
				}
			}
		} else if (object && object.type == 'integer') {
			if (intValidFormats.indexOf(object.format) < 0)
				delete object.format;
		} else if (object && object.type == 'number') {
			if (intValidFormats.concat(['long', 'float', 'double']).indexOf(object.format) < 0) {
        if (object.format == 'integer')
          object['type'] = 'integer';
        delete object.format;
      }
		}
	}
	
	static convertSchemaTitles(object, objectType, ramlDef) {
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;
			const val = object[id];
			if (id === 'title' && typeof val === 'string') {
				if (objectType === 'schema')
					RAMLExporter._createAnnotation(object, 'schema-title', val, ramlDef);
				else if (objectType === 'property')
					RAMLExporter._createAnnotation(object, 'property-title', val, ramlDef);
				
				delete object[id];
			}
		}
		
		return object;
	}
	
	_mapParametersTraits(slTraits, ramlDef) {
		const traits = this.initializeTraits();
		
		for (const i in slTraits) {
			if (!slTraits.hasOwnProperty(i)) continue;
			const slTrait = slTraits[i];
			const trait = {};
			
			try {
				const queryString = jsonHelper.parse(slTrait.request.queryString);
				if (!jsonHelper.isEmptySchema(queryString)) {
					trait.queryParameters = this._mapNamedParams(queryString, ramlDef);
				}
			} catch (e) {
				// ignore
			}
			
			try {
				const headers = jsonHelper.parse(slTrait.request.headers);
				if (!jsonHelper.isEmptySchema(headers)) {
					trait.headers = this._mapNamedParams(headers);
				}
			} catch (e) {
				// ignore
			}
			
			try {
				const formData = jsonHelper.parse(slTrait.request.formData);
				if (!jsonHelper.isEmptySchema(formData)) {
					trait.body = this._mapRequestBody(formData, 'multipart/form-data');
				}
			} catch (e) {
				// ignore
			}
			
			try {
				const body = jsonHelper.parse(slTrait.request.body);
				if (!jsonHelper.isEmptySchema(body)) {
					trait.body = this._mapRequestBody(body, 'application/json', ramlDef);
				}
			} catch (e) {
				// ignore
			}
			
			
			if (!_.isEmpty(slTrait.responses)) {
				//ignore responses as traits
				continue;
			}
			
			this.addTrait(slTrait.name, trait, traits);
		}
		
		return traits;
	}
	
	_mapResponsesTraits(slTraits, mimeType) {
		const responses = {};
		
		for (const i in slTraits) {
			if (!slTraits.hasOwnProperty(i)) continue;
			const slTrait = slTraits[i];
			
			try {
				if (slTrait.responses && slTrait.responses.length) {
					const response = this._mapResponseBody(slTrait.responses, mimeType);
					responses[slTrait.name] = response['200'];
				}
			} catch (e) {
				// ignore
			}
		}
		
		return responses;
	}
	
	static _mapEndpointTraits(slTraits, endpoint) {
		const is = [];
		
		for (const i in endpoint.traits) {
			if (!endpoint.traits.hasOwnProperty(i)) continue;
			const trait = _.find(slTraits, ['_id', endpoint.traits[i]]);
			if (!trait) {
				continue;
			}
			is.push(_.camelCase(trait.name));
		}
		
		return is;
	}
	
	static getDefaultMimeType(mimeType, defMimeType) {
		let mt = (mimeType && mimeType.length > 0) ? mimeType[0] : null;
		if (!mt) {
			if (_.isArray(defMimeType) && defMimeType.length) {
				mt = defMimeType[0];
			} else if (_.isString(defMimeType) && defMimeType !== '') {
				mt = defMimeType;
			}
		}
		if (!mt) {
			mt = 'application/json'; //default mime Type isn't present
		}
		return mt;
	}
	
	_export() {
		const env = this.project.Environment;
		const ramlDef = new RAMLDefinition(this.project.Name, env);
		
		ramlDef.mediaType = this.mapMediaType(env.Consumes, env.Produces);
		this.description(ramlDef, this.project);
		
		if (this.project.tags) {
			RAMLExporter._addTags(ramlDef, this.project.tags);
		}
		
		if (this.project.Environment.extensions) {
			if (!ramlDef['(oas-info)']) {
				ramlDef['(oas-info)'] = {};
			}
			RAMLExporter._createAnnotation(ramlDef, 'info', this.project.Environment.extensions, ramlDef);
			RAMLExporter._addExtensions(ramlDef, ramlDef['(oas-info)'], this.project.Environment.extensions);
		}
		
		if (this.project.Environment.ExternalDocs) {
			const value = {
				'description': this.project.Environment.ExternalDocs.description,
				'url': this.project.Environment.ExternalDocs.url
			};
			RAMLExporter._createAnnotation(ramlDef, 'externalDocs', value, ramlDef);
			
			if (this.project.Environment.ExternalDocs.extensions) {
				RAMLExporter._addExtensions(ramlDef, ramlDef['(oas-externalDocs)'], this.project.Environment.ExternalDocs.extensions);
			}
		}
		
		if (this.project.Environment.contactInfo) {
			const contact = {
				contact: {}
			};
			
			if (this.project.Environment.contactInfo.name) {
				contact['contact'].name = this.project.Environment.contactInfo.name;
			}
			if (this.project.Environment.contactInfo.url) {
				contact['contact'].url = this.project.Environment.contactInfo.url;
			}
			if (this.project.Environment.contactInfo.email) {
				contact['contact'].email = this.project.Environment.contactInfo.email;
			}
			
			RAMLExporter._createAnnotation(ramlDef, 'info', contact, ramlDef);
			
			if (this.project.Environment.contactInfo.extensions) {
				RAMLExporter._addExtensions(ramlDef, ramlDef['(oas-info)'].contact, this.project.Environment.contactInfo.extensions);
			}
		}
		
		if (this.project.Environment.termsOfService) {
			const value = {
				termsOfService: this.project.Environment.termsOfService
			};
			
			RAMLExporter._createAnnotation(ramlDef, 'info', value, ramlDef);
		}
		
		if (this.project.Environment.license) {
			const value = {
				license : {}
			};
			if (this.project.Environment.license.name) {
				value['license'].name = this.project.Environment.license.name;
			}
			if (this.project.Environment.license.url) {
				value['license'].url = this.project.Environment.license.url;
			}
			
			RAMLExporter._createAnnotation(ramlDef, 'info', value, ramlDef);
			
			if (this.project.Environment.license.extensions) {
				RAMLExporter._addExtensions(ramlDef, ramlDef['(oas-info)'].license, this.project.Environment.license.extensions);
			}
		}
		
		const docs = this._mapTextSections(this.project.Texts);
		if (docs.length) {
			ramlDef.documentation = ramlDef.documentation || [];
			ramlDef.documentation = ramlDef.documentation.concat(docs);
		}
		
		const slSecuritySchemes = this.project.Environment.SecuritySchemes;
		const securitySchemes = this._mapSecurityScheme(slSecuritySchemes);
		
		if (!_.isEmpty(securitySchemes)) {
			ramlDef.securitySchemes = securitySchemes;
		}
		
		if (!_.isEmpty(this.project.endpointExtensions)) {
			if (!ramlDef['(oas-paths)']) {
				ramlDef['(oas-paths)'] = {};
			}
			RAMLExporter._addExtensions(ramlDef, ramlDef['(oas-paths)'], this.project.endpointExtensions);
			ramlDef.annotationTypes['oas-paths'] = {
				type: 'any',
				allowedTargets: 'API'
			};
		}
		
		const endpoints = this.project.Endpoints;
		
		// Collect endpoints ids from environment resourcesOrder
		const orderedIds = env.resourcesOrder.docs.reduce(function (ids, group) {
			return ids.concat(_.map(_.filter(group.items, {type: 'endpoints'}), '_id'));
		}, []);
		
		// Sort endpoints similar to resourcesOrder items order
		endpoints.sort(function (a, b) {
			return orderedIds.indexOf(a._id) < orderedIds.indexOf(b._id) ? -1 : 1;
		});
		
		for (const i in endpoints) {
			if (!endpoints.hasOwnProperty(i)) continue;
			const endpoint = endpoints[i];
			
			const method = {};
			if (endpoint.extensions) {
				RAMLExporter._addExtensions(ramlDef, method, endpoint.extensions);
			}
			
			this.setMethodDisplayName(method, endpoint.operationId || endpoint.Name);
			if (endpoint.Description) {
				method.description = endpoint.Description;
			}
			if (endpoint.Summary) {
				RAMLExporter._createAnnotation(method, 'summary', endpoint.Summary, ramlDef);
			}
			
			const protocols = RAMLExporter.mapProtocols(endpoint.protocols);
			if (!_.isEmpty(protocols)) {
				method.protocols = protocols;
			}
			
			const is = RAMLExporter._mapEndpointTraits(this.project.Traits, endpoint);
			if (is.length) {
				method.is = is;
			}
			
			if (_.toLower(endpoint.Method) === 'post' ||
				_.toLower(endpoint.Method) === 'put' ||
				_.toLower(endpoint.Method) === 'patch') {
				const mimeType = RAMLExporter.getDefaultMimeType(endpoint.Consumes, ramlDef.mediaType);
				if (_.isArray(endpoint.Body) && endpoint.Body.length > 0) {
					const body = this._mapRequestBody(endpoint.Body[0], mimeType, ramlDef);
					if (!_.isEmpty(body)) {
						method.body = body;
					}
				}
			}
			
			method.headers = this._mapNamedParams(endpoint.Headers, ramlDef);
			
			const mimeType = RAMLExporter.getDefaultMimeType(endpoint.Produces, ramlDef.mediaType);
			const responses = this._mapResponseBody(endpoint.Responses, mimeType, ramlDef);
			if (!_.isEmpty(responses)) {
				if (responses.default) {
					RAMLExporter._createAnnotation(method, 'responses-default', responses.default, ramlDef);
					delete responses.default;
				}
				if (!_.isEmpty(responses)) {
					method.responses = responses;
				}
			}
			
			method.queryParameters = this._mapURIParams(endpoint.QueryString, ramlDef);
			
			method.uriParameters = this._mapURIParams(endpoint.PathParams, ramlDef);
			
			if (endpoint.securedBy) {
				const rsecuredBy = [];
				if (endpoint.securedBy.oauth2) {
					for (const index in slSecuritySchemes.oauth2) {
						if (!slSecuritySchemes.oauth2.hasOwnProperty(index)) continue;
						const current = slSecuritySchemes.oauth2[index];
						if (current.name === endpoint.securedBy.oauth2.name) {
							const securedName = current.name || 'oauth2';
							if (!_.isEmpty(endpoint.securedBy.oauth2.scope)) {
								const scopes = {};
								scopes[securedName] = {
									scopes: endpoint.securedBy.oauth2.scope
								};
								rsecuredBy.push(scopes);
							}
							else {
								rsecuredBy.push(securedName);
							}
						}
					}
				}
				if (endpoint.securedBy.basic && slSecuritySchemes.basic) {
					for (const index in slSecuritySchemes.basic) {
						if (!slSecuritySchemes.basic.hasOwnProperty(index)) continue;
						const current = slSecuritySchemes.basic[index];
						if (endpoint.securedBy.basic.name === current.name) {
							rsecuredBy.push(current.name);
						}
					}
				}
				if (endpoint.securedBy.apiKey) {
					if (slSecuritySchemes.apiKey) {
						if (!_.isEmpty(slSecuritySchemes.apiKey.headers)) {
							for (const index in slSecuritySchemes.apiKey.headers) {
								if (!slSecuritySchemes.apiKey.headers.hasOwnProperty(index)) continue;
								const current = slSecuritySchemes.apiKey.headers[index];
								if (current.externalName === endpoint.securedBy.apiKey.name) {
									rsecuredBy.push(current.externalName);
								}
							}
						}
						if (!_.isEmpty(slSecuritySchemes.apiKey.queryString)) {
							for (const index in slSecuritySchemes.apiKey.queryString) {
								if (!slSecuritySchemes.apiKey.queryString.hasOwnProperty(index)) continue;
								const current = slSecuritySchemes.apiKey.queryString[index];
								if (current.externalName === endpoint.securedBy.apiKey.name) {
									rsecuredBy.push(current.externalName);
								}
							}
						}
					}
				}
				if (rsecuredBy.length > 0) {
					method.securedBy = rsecuredBy;
				}
			}
			
			const uriParts = endpoint.Path.split('/');
			uriParts.splice(0, 1);
			ramlDef.addMethod(ramlDef, uriParts, endpoint.Method, method, this.project.getPathParamRef(endpoint.Path));
			
			if (endpoint.Tags && !_.isEmpty(endpoint.Tags)) {
				RAMLExporter._createAnnotation(method, 'tags', endpoint.Tags, ramlDef);
			}
			
			if (endpoint.Deprecated) {
				RAMLExporter._createAnnotation(method, 'deprecated', endpoint.Deprecated, ramlDef);
			}
			
			if (endpoint.ExternalDocs) {
				const value = {
					'description': endpoint.ExternalDocs.description,
					'url': endpoint.ExternalDocs.url
				};
				RAMLExporter._createAnnotation(method, 'externalDocs', value, ramlDef);
			}
			
			if (endpoint.responses.extensions) {
				RAMLExporter._addExtensions(ramlDef, method.responses, endpoint.responses.extensions);
			}
			
			for (const i in method) {
				if (!method.hasOwnProperty(i)) continue;
				const value = method[i];
				if (typeof value === 'object') RAMLExporter._addInnerExtensions(ramlDef, value);
			}
			
			for (const i in method.responses) {
				if (!method.responses.hasOwnProperty(i)) continue;
				const response = method.responses[i];
				RAMLExporter._addExampleExtensions(ramlDef, response.body);
			}
		}
		
		RAMLExporter.removeDisplayName(ramlDef);
		
		const schemas = this.project.Schemas;
		if (schemas && schemas.length > 0) {
			this.addSchema(ramlDef, this.mapSchema(schemas, ramlDef));
		}
		
		for (const i in schemas) {
			if (!schemas.hasOwnProperty(i)) continue;
			const schema = schemas[i];
			if (typeof schema === 'object') {
				const object = schema.definition;
				RAMLExporter._addInnerExtensions(ramlDef, object);
				RAMLExporter._addInnerExternalDocs(ramlDef, object);
			}
		}
		
		if (this.project.Traits && this.project.Traits.length > 0) {
			const traits = this._mapParametersTraits(this.project.Traits, ramlDef);
			if (!_.isEmpty(traits)) {
				ramlDef.traits = traits;
			}
		}
		
		//export responses
		if (this.project.Traits && this.project.Traits.length > 0) {
			const responses = this._mapResponsesTraits(this.project.Traits);
			if (!_.isEmpty(responses)) {
				RAMLExporter._createAnnotation(ramlDef, 'responses', responses, ramlDef);
			}
		}
		
		// Clean empty field in definition
		for (const field in ramlDef) {
			if (ramlDef.hasOwnProperty(field) && !ramlDef[field]) {
				delete ramlDef[field];
			}
		}
		
		RAMLExporter._addExtensions(ramlDef, ramlDef, this.project.extensions);
		this.data = ramlHelper.removeEmptyValueNodes(ramlDef);
	}
	
	static removeDisplayName(resource) {
		delete resource.displayName;
		for (const id in resource) {
			if (!resource.hasOwnProperty(id) || !id.startsWith('/')) continue;
			const value = resource[id];
			if (typeof value === 'object') {
				RAMLExporter.removeDisplayName(value);
			}
		}
	}
	
	static _addTags(ramlDef, tags) {
		if (_.isEmpty(tags)) return;
		
		ramlDef['(oas-tags-definition)'] = [];
		
		if (!ramlDef.annotationTypes) {
			ramlDef.annotationTypes = {};
		}
		ramlDef.annotationTypes['oas-tags-definition'] = {
			type: 'array',
			items: {
				properties: {
					name: 'string',
					'description?': 'string',
					'externalDocs?': {
						properties: {
							url: 'string',
							'description?': 'string'
						}
					}
				}
			},
			allowedTargets: 'API'
		};
		
		for (const key in tags) {
			if (!tags.hasOwnProperty(key)) continue;
			
			ramlDef['(oas-tags-definition)'].push(tags[key]);
		}
	}
	
	// allowedTargets?
	static _addExtensions(ramlDef, ramlObject, extensions) {
		for (const key in extensions) {
			if (!extensions.hasOwnProperty(key)) continue;
			
			if (ramlObject.hasOwnProperty(key)) delete ramlObject[key];
			const annotationKey = (key === 'example') ? 'responses-'.concat(key) : key;
			ramlObject['(oas-' + annotationKey + ')'] = extensions[key];
			if (!ramlDef.annotationTypes) ramlDef.annotationTypes = {};
			if (!ramlDef.annotationTypes.hasOwnProperty('oas-' + annotationKey)) {
				switch (key) {
					case 'example':
						ramlDef.annotationTypes['oas-' + annotationKey] = { type: 'string', allowedTargets: 'TypeDeclaration' };
						break;
					case 'externalDocs':
						ramlDef.annotationTypes['oas-' + annotationKey] = { properties: { 'description?': 'string', 'url': 'string' }, allowedTargets: ['API', 'Method', 'TypeDeclaration'] };
						break;
					default:
						ramlDef.annotationTypes['oas-' + key] = 'any';
						break;
				}
			}
		}
	}
	
	static _addExampleExtensions(ramlDef, object) {
		for (const key in object) {
			if (!object.hasOwnProperty(key)) continue;
			const type = object[key];
			if (!type.hasOwnProperty('example')) continue;
			const value = type['example'];
			if (typeof value === 'string') RAMLExporter._addExtensions(ramlDef, type, {'example':value});
		}
	}
	
	static _addInnerExtensions(ramlDef, object) {
		const extensions = {};
		const innerObjects = {};
		for (const key in object) {
			if (!object.hasOwnProperty(key)) continue;
			const value = object[key];
			if (_.startsWith(key, 'x-')) {
				extensions[key] = value;
			} else if (typeof value === 'object') {
				innerObjects[key] = value;
			}
		}
		if (!_.isEmpty(extensions)) RAMLExporter._addExtensions(ramlDef, object, extensions);
		for (const key in innerObjects) {
			if (!innerObjects.hasOwnProperty(key)) continue;
			const obj = innerObjects[key];
			RAMLExporter._addInnerExtensions(ramlDef, obj);
		}
	}
	
	static _addInnerExternalDocs(ramlDef, object) {
		const innerObjects = {};
		for (const key in object) {
			if (!object.hasOwnProperty(key)) continue;
			const value = object[key];
			if (key === 'externalDocs') RAMLExporter._addExtensions(ramlDef, object, {'externalDocs':value});
			else if (typeof value === 'object') innerObjects[key] = value;
		}
		for (const key in innerObjects) {
			if (!innerObjects.hasOwnProperty(key)) continue;
			const obj = innerObjects[key];
			RAMLExporter._addInnerExternalDocs(ramlDef, obj);
		}
	}
	
	_unescapeYamlIncludes(yaml) {
		const start = yaml.indexOf("'!include ");
		if (start == -1) return yaml;
		const end = yaml.indexOf("'", start + 1);
		if (end == -1) return yaml;
		return yaml.substring(0, start) + yaml.substring(start + 1, end) + this._unescapeYamlIncludes(yaml.substring(end + 1));
	}
	
	_getData(format) {
		switch (format) {
			case 'yaml': {
				const yaml = this._unescapeYamlIncludes(YAML.dump(jsonHelper.parse(JSON.stringify(this.Data)), {lineWidth: -1}));
				return '#%RAML ' + this.version() + '\n' + yaml;
			}
			default:
				throw Error('RAML doesn not support ' + format + ' format');
		}
	}
	
	convertRequiredFromProperties(object, insideProperties) {
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;
			const val = object[id];
			
			if (val && (typeof val) === 'object' && id !== 'required') {
				this.convertRequiredFromProperties(val, id === 'properties' && !insideProperties);
			}
			if (id === 'properties' && !insideProperties) {
				for (const propId in object.properties) {
					if (!object.properties.hasOwnProperty(propId) || propId === '//') continue;
					const property = object.properties[propId];
					if (!RAMLExporter.checkRequiredProperty(object, propId) && typeof property === 'object') {
						property.required = false;
					}
				}
				delete object.required;
			}
		}
	}
	
	static checkRequiredProperty(object, paramName) {
		if (!object.required) return false;
		
		if (object.required && object.required.length > 0) {
			for (const j in object.required) {
				if (!object.required.hasOwnProperty(j)) continue;
				const requiredParam = object.required[j];
				if (requiredParam === paramName) {
					return true;
				}
			}
		}
		return false;
	}
	
	description() {
		throw new Error('description method not implemented');
	}
	
	version() {
		throw new Error('version method not implemented');
	}
	
	mapAuthorizationGrants() {
		throw new Error('mapAuthorizationGrants method not implemented');
	}
	
	mapBody() {
		throw new Error('mapBody method not implemented');
	}
	
	mapRequestBodyForm() {
		throw new Error('mapRequestBodyForm method not implemented');
	}
	
	addSchema() {
		throw new Error('addSchema method not implemented');
	}
	
	mapSchema() {
		throw new Error('mapSchema method not implemented');
	}
	
	getApiKeyType() {
		throw new Error('getApiType method not implemented');
	}
	
	mapSecuritySchemes() {
		throw new Error('mapSecuritySchemes method not implemented');
	}
	
	setMethodDisplayName() {
		throw new Error('setMethodDisplayName method not implemented');
	}
	
	initializeTraits() {
		throw new Error('initializeTraits method not implemented');
	}
	
	addTrait() {
		throw new Error('addTrait method not implemented');
	}
	
	mapMediaType() {
		throw new Error('mapMediaType method not implemented');
	}
}

module.exports = RAMLExporter;
