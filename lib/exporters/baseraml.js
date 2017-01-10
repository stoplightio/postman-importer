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
		let baseUri = env.Host + env.BasePath;
		if (baseUri) {
			this.baseUri = baseUri;
		}
		this.mediaType = env.DefaultResponseType || '';
		
		let protocols = RAMLExporter.mapProtocols(env.Protocols);
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
			for (let attrname in method.uriParameters) {
				if (!method.uriParameters.hasOwnProperty(attrname)) continue;
				//uri not available, so check with displayName, which is same
				if (resource.displayName) {
					let isURIParamExist = resource.displayName.split(attrname).length - 1;
					if (isURIParamExist) {
						resource.uriParameters[attrname] = method.uriParameters[attrname];
					}
				}
			}
			
			delete method.uriParameters;
			if (_.isEmpty(resource.uriParameters)) delete resource.uriParameters;
			
			resource[methodKey] = method;
			if (!_.isEmpty(pathParamsRef)) {
				let is = [];
				for (let key in pathParamsRef) {
					if (!pathParamsRef.hasOwnProperty(key)) continue;
					is.push(_.camelCase(pathParamsRef[key]));
				}
				resource.is = is;
			}
		}
		else {
			let currentURI = '/' + methodURIs[0];
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
		this.hasTags = false;
		this.hasDeprecated = false;
		this.hasExternalDocs = false;
		this.hasInfo = false;
		this.hasSummary = false;
		this.hasSchemaTitle = false;
		this.hasBodyName = false;
		this.hasResponsesDefault = false;
		this.hasGlobalResponseDefinition = false;
		this.hasDefinitionName = false;
	}
	
	_mapSecurityScheme(slSecuritySchemes) {
		let ramlSecuritySchemes = {};
		
		if (slSecuritySchemes.hasOwnProperty('oauth2')) {
			for (let index in slSecuritySchemes.oauth2) {
				if (!slSecuritySchemes.oauth2.hasOwnProperty(index)) continue;
				
				let current = slSecuritySchemes.oauth2[index];
				
				let name = current.name || 'oauth2';
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
				
				let scopes = [];
				if (current.scopes && !_.isEmpty(current.scopes)) {
					for (let index in current.scopes) {
						if (!current.scopes.hasOwnProperty(index)) continue;
						let scope = current.scopes[index].name;
						scopes.push(scope);
					}
					
					ramlSecuritySchemes[name]['settings']['scopes'] = scopes;
				}
			}
		}
		
		if (slSecuritySchemes.hasOwnProperty('basic')) {
			for (let index in slSecuritySchemes.basic) {
				if (!slSecuritySchemes.basic.hasOwnProperty(index)) continue;
				let current = slSecuritySchemes.basic[index];
				
				let basicName = current.name;
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
				for (let index in slSecuritySchemes.apiKey.headers) {
					if (!slSecuritySchemes.apiKey.headers.hasOwnProperty(index)) continue;
					let current = slSecuritySchemes.apiKey.headers[index];
					let content = {
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
				for (let index in slSecuritySchemes.apiKey.queryString) {
					if (!slSecuritySchemes.apiKey.queryString.hasOwnProperty(index)) continue;
					let current = slSecuritySchemes.apiKey.queryString[index];
					let content = {
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
		let acceptedTypes = ['string', 'number', 'integer', 'date', 'boolean', 'file', 'array', 'datetime'];
		for (let key in params) {
			if (!params.hasOwnProperty(key)) continue;
			let param = params[key];
			for (let prop in param) {
				if (!param.hasOwnProperty(prop)) continue;
				switch (prop) {
					case 'type': {
						let type = params[key].type;
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
						let typeLowercase = _.toLower(params[key].type);
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
					case 'collectionFormat':
					case 'allowEmptyValue':
					case 'exclusiveMaximum':
					case 'exclusiveMinimum':
					case 'facets':
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
	
	_mapRequestBody(bodyData, mimeType) {
		let body = {};
		if (!bodyData.body || mimeType === '') return body;
		
		switch (mimeType) {
			case 'application/json':
				body[mimeType] = this.mapBody(bodyData);
				if (bodyData.name) {
					this.hasBodyName = true;
					body[mimeType]['(oas-body-name)'] = bodyData.name;
				}
				break;
			case 'multipart/form-data':
			case 'application/x-www-form-urlencoded': {
				let parsedBody = jsonHelper.parse(bodyData.body);
				body[mimeType] = this.mapRequestBodyForm(this.convertRefFromModel(parsedBody));
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
	
	_mapNamedParams(params) {
		if (!params || _.isEmpty(params.properties)) return;
		
		let newParams = {};
		let convertedParams = this.convertRefFromModel(params.properties);
		for (let key in convertedParams) {
			if (!convertedParams.hasOwnProperty(key)) continue;
			newParams[key] = ramlHelper.setParameterFields(convertedParams[key], {});
			if (params.required && params.required.indexOf(key) > -1) {
				newParams[key].required = true;
			}
			newParams[key] = jsonHelper.orderByKeys(newParams[key], ['type', 'description']);
		}
		return RAMLExporter._validateParam(newParams);
	}
	
	_mapResponseBody(responseData, mimeType) {
		let responses = {};
		
		for (let i in responseData) {
			if (!responseData.hasOwnProperty(i)) continue;
			
			let resBody = responseData[i];
			if (!_.isEmpty(resBody.codes)) {
				let code = resBody.codes[0];
				if (parseInt(code) == 'NaN' || _.startsWith(code, 'x-')) {
					continue;
				}
				
				responses[code] = {};
				
				let type = mimeType;
				let body = this.mapBody(resBody, type);
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
					responses[code].headers = this._mapNamedParams(resBody.headers);
				}
				
				if (resBody.response_id) {
					this.hasGlobalResponseDefinition = true;
					responses[code]['(oas-global-response-definition)'] = resBody.response_id;
					delete resBody.response_id;
				}
			}
		}
		
		return responses;
	}
	
	//TODO: Stoplight doesn't support seperate path params completely yet
	_mapURIParams(pathParamData) {
		if (!pathParamData.properties || _.isEmpty(pathParamData.properties)) {
			return;
		}
		
		let pathParams = {};
		for (let key in pathParamData.properties) {
			if (!pathParamData.properties.hasOwnProperty(key)) continue;
			let prop = pathParamData.properties[key];
			RAMLExporter._mapFormats(prop);

			pathParams[key] = ramlHelper.setParameterFields(prop, {});
			if (prop.description) {
				pathParams[key].displayName = prop.description;
			}
			if (prop.items) {
				let items = prop.items;
				RAMLExporter._mapFormats(items);
				pathParams[key].items = items;
			}
			
			if (prop.format) {
				pathParams[key].format = prop.format;
			}
			
			pathParams[key].type = pathParams[key].type || 'string';
			
			//facets
			RAMLExporter._addFacetsDeclaration(prop, pathParams[key]);
		}
		
		return RAMLExporter._validateParam(pathParams);
	}
	
	static mapProtocols(protocols) {
		let validProtocols = [];
		for (let i in protocols) {
			if (!protocols.hasOwnProperty(i) || ((_.toLower(protocols[i]) != 'http') && (_.toLower(protocols[i]) != 'https'))) {
				//RAML incompatible formats( 'ws' etc)
				continue;
			}
			validProtocols.push(_.toUpper(protocols[i]));
		}
		return validProtocols;
	}
	
	_mapTextSections(slTexts) {
		let results = [];
		if (!slTexts) return resilts;
		
		for (let i in slTexts) {
			if (!slTexts.hasOwnProperty(i)) continue;
			let text = slTexts[i];
			
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
	convertRefFromModel(object, insideProperties) {
		RAMLExporter._mapFormats(object);
		for (let id in object) {
			if (object.hasOwnProperty(id)) {
				let val = object[id];
				if (id == '$ref') {
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
						for (let key in val) {
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
					} else if (id === 'title') {
						object['(oas-schema-title)'] = val;
						this.hasSchemaTitle = true;
						delete object[id];
					} else if (id === 'collectionFormat') {
						if (!object.facets) {
							object.facets = {};
						}
						object.facets['collectionFormat'] = 'string';
					}
				} else if (val && (typeof val) === 'object' && id !== 'facets') {
					RAMLExporter._mapFormats(val);
					if (!insideProperties) {
						if (id === 'example' && object.type === undefined)
							object['type'] = typeof val;
						else if (object.hasOwnProperty('items') && object.type !== 'array')
							object['type'] = 'array';
					} else if (val.hasOwnProperty('additionalProperties'))
						val.type = 'object';
					if (val.type != 'string') {
						object[id] = this.convertRefFromModel(val, id === 'properties');
					}
				} else if (id === '$ref') {
					object.type = val.replace('#/definitions/', '');
					delete object[id];
				} else if (id === 'exclusiveMinimum' || id === 'exclusiveMaximum' || id === 'allowEmptyValue' || id === 'collectionFormat') {
					if (!object.facets) {
						object.facets = {};
					}
					if (id === 'exclusiveMinimum') {
						object.facets['exclusiveMinimum'] = 'boolean';
					}
					if (id === 'exclusiveMaximum') {
						object.facets['exclusiveMaximum'] = 'boolean';
					}
					if (id === 'allowEmptyValue') {
						object.facets['allowEmptyValue'] = 'boolean';
					}
					if (id === 'collectionFormat') {
						object.facets['collectionFormat'] = 'string';
					}
				} else if (id === 'readOnly') {
					if (!object['facets']) object['facets'] = {};
                    object['facets']['readOnly?'] = 'boolean';
				}
				if (val.hasOwnProperty('readOnly') && id !== 'properties') {
					if (!val['facets']) val['facets'] = {};
					val['facets']['readOnly?'] = 'boolean';
				}
			}
		}
		
		return object;
	}
	
	static _mapFormats(object) {
		if (object && !object.hasOwnProperty('type') && object.format == 'string') {
			object['type'] = 'string';
			delete object.format;
		} else if (object && object.type == 'string'){
			if (object.format == 'byte' || object.format == 'binary' || object.format == 'password' || object.format == 'uuid') {
				if (!object['facets']) object['facets'] = {};
				object['facets']['format'] = 'string';
			} else if (object.format == 'date') {
				object['type'] = 'date-only';
				delete object.format;
			} else if (object.format == 'date-time') {
				object['type'] = 'datetime';
				object['format'] = 'rfc3339';
			}
			else {
				if (object.format && ramlHelper.getValidFormat.indexOf(object.format) < 0) {
					object['facets'] = {'format': 'string'};
				}
			}
		} else if (object && object.type == 'integer') {
			if (['int', 'int8', 'int16', 'int32', 'int64'].indexOf(object.format) < 0)
				delete object.format;
		}
	}
	
	static _addFacetsDeclaration(property, target) {
		if (property.hasOwnProperty('collectionFormat') || property.hasOwnProperty('allowEmptyValue') ||
			property.hasOwnProperty('exclusiveMaximum') || property.hasOwnProperty('exclusiveMinimum')) {
			
			if (!target['facets']) {
				target['facets'] = {};
			}
			
			if (property.hasOwnProperty('collectionFormat')) {
				target['facets']['collectionFormat'] = 'string';
			}
			if (property.hasOwnProperty('allowEmptyValue')) {
				target['facets']['allowEmptyValue'] = 'boolean';
			}
			if (property.hasOwnProperty('exclusiveMaximum')) {
				target['facets']['exclusiveMaximum'] = 'boolean';
			}
			if (property.hasOwnProperty('exclusiveMinimum')) {
				target['facets']['exclusiveMinimum'] = 'boolean';
			}
		}
	}
	
	_mapParametersTraits(slTraits) {
		let traits = this.initializeTraits();
		
		for (let i in slTraits) {
			if (!slTraits.hasOwnProperty(i)) continue;
			let slTrait = slTraits[i];
			let trait = {};
			
			try {
				let queryString = jsonHelper.parse(slTrait.request.queryString);
				if (!jsonHelper.isEmptySchema(queryString)) {
					trait.queryParameters = this._mapNamedParams(queryString);
				}
			} catch (e) {
				// ignore
			}
			
			try {
				let headers = jsonHelper.parse(slTrait.request.headers);
				if (!jsonHelper.isEmptySchema(headers)) {
					trait.headers = this._mapNamedParams(headers);
				}
			} catch (e) {
				// ignore
			}
			
			try {
				let formData = jsonHelper.parse(slTrait.request.formData);
				if (!jsonHelper.isEmptySchema(formData)) {
					trait.body = this._mapRequestBody(formData, 'multipart/form-data');
				}
			} catch (e) {
				// ignore
			}
			
			try {
				let body = jsonHelper.parse(slTrait.request.body);
				if (!jsonHelper.isEmptySchema(body)) {
					trait.body = this._mapRequestBody(body, 'application/json');
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
		let responses = {};
		
		for (let i in slTraits) {
			if (!slTraits.hasOwnProperty(i)) continue;
			let slTrait = slTraits[i];
			
			try {
				if (slTrait.responses && slTrait.responses.length) {
					let response = this._mapResponseBody(slTrait.responses, mimeType);
					responses[slTrait.name] = response['200'];
				}
			} catch (e) {
				// ignore
			}
		}
		
		return responses;
	}
	
	static _mapEndpointTraits(slTraits, endpoint) {
		let is = [];
		
		for (let i in endpoint.traits) {
			if (!endpoint.traits.hasOwnProperty(i)) continue;
			let trait = _.find(slTraits, ['_id', endpoint.traits[i]]);
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
	
	_annotationsSignature(ramlDef) {
		if (this.hasTags || this.hasDeprecated || this.hasExternalDocs || this.hasInfo ||
			this.hasSummary || this.hasSchemaTitle || this.hasBodyName || this.hasResponsesDefault ||
			this.hasGlobalResponseDefinition || this.hasDefinitionName) {
			if (!ramlDef.annotationTypes) {
				ramlDef.annotationTypes = {};
			}
			
			if (this.hasTags) {
				ramlDef.annotationTypes['oas-tags'] = {
					type: 'string[]',
					allowedTargets: 'Method'
				};
			}
			
			if (this.hasDeprecated) {
				ramlDef.annotationTypes['oas-deprecated'] = {
					type: 'boolean',
					allowedTargets: 'Method'
				};
			}
			
			if (this.hasSummary) {
				ramlDef.annotationTypes['oas-summary'] = {
					type: 'string',
					allowedTargets: 'Method'
				};
			}
			
			if (this.hasExternalDocs) {
				ramlDef.annotationTypes['oas-externalDocs'] = {
					properties: {
						'description?': 'string',
						'url': 'string'
					},
					allowedTargets: ['API', 'Method', 'TypeDeclaration']
				};
			}
			
			if (this.hasInfo) {
				ramlDef.annotationTypes['oas-info'] = {
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
			}
			
			if (this.hasSchemaTitle) {
				ramlDef.annotationTypes['oas-schema-title'] = {
					type: 'string',
					allowedTargets: 'TypeDeclaration'
				};
			}
			
			if (this.hasBodyName) {
				ramlDef.annotationTypes['oas-body-name'] = {
					type: 'string',
					allowedTargets: 'TypeDeclaration'
				};
			}
			
			if (this.hasResponsesDefault) {
				ramlDef.annotationTypes['oas-responses-default'] = {
					type: 'any',
					allowedTargets: 'Method'
				};
			}
			
			if (this.hasGlobalResponseDefinition) {
				ramlDef.annotationTypes['oas-global-response-definition'] = {
					type: 'any',
					allowedTargets: 'Response'
				};
			}
			
			if (this.hasDefinitionName) {
				ramlDef.annotationTypes['oas-definition-name'] = {
					type: 'string',
					allowedTargets: 'TypeDeclaration'
				};
			}
		}
	}
	
	_export() {
		let env = this.project.Environment;
		let ramlDef = new RAMLDefinition(this.project.Name, env);
		
		ramlDef.mediaType = this.mapMediaType(env.Consumes, env.Produces);
		this.description(ramlDef, this.project);
		
		if (this.project.tags) {
			RAMLExporter._addTags(ramlDef, this.project.tags);
		}
		
		if (this.project.Environment.extensions) {
			if (!ramlDef['(oas-info)']) {
				ramlDef['(oas-info)'] = {};
			}
			RAMLExporter._addExtensions(ramlDef, ramlDef['(oas-info)'], this.project.Environment.extensions);
		}
		
		if (this.project.Environment.ExternalDocs) {
			this.hasExternalDocs = true;
			ramlDef['(oas-externalDocs)'] = {
				'description': this.project.Environment.ExternalDocs.description,
				'url': this.project.Environment.ExternalDocs.url
			};
			
			if (this.project.Environment.ExternalDocs.extensions) {
				RAMLExporter._addExtensions(ramlDef, ramlDef['(oas-externalDocs)'], this.project.Environment.ExternalDocs.extensions);
			}
		}
		
		if (this.project.Environment.contactInfo || this.project.Environment.termsOfService || this.project.Environment.license || this.project.Environment.extensions) {
			if (!ramlDef['(oas-info)']) {
				ramlDef['(oas-info)'] = {};
			}
			this.hasInfo = true;
		}
		
		if (this.project.Environment.contactInfo) {
			ramlDef['(oas-info)'].contact = {};
			if (this.project.Environment.contactInfo.name) {
				ramlDef['(oas-info)'].contact.name = this.project.Environment.contactInfo.name;
			}
			if (this.project.Environment.contactInfo.url) {
				ramlDef['(oas-info)'].contact.url = this.project.Environment.contactInfo.url;
			}
			if (this.project.Environment.contactInfo.email) {
				ramlDef['(oas-info)'].contact.email = this.project.Environment.contactInfo.email;
			}
			
			if (this.project.Environment.contactInfo.extensions) {
				RAMLExporter._addExtensions(ramlDef, ramlDef['(oas-info)'].contact, this.project.Environment.contactInfo.extensions);
			}
		}
		
		if (this.project.Environment.termsOfService) {
			ramlDef['(oas-info)'].termsOfService = this.project.Environment.termsOfService;
		}
		
		if (this.project.Environment.license) {
			ramlDef['(oas-info)'].license = {};
			if (this.project.Environment.license.name) {
				ramlDef['(oas-info)'].license.name = this.project.Environment.license.name;
			}
			if (this.project.Environment.license.url) {
				ramlDef['(oas-info)'].license.url = this.project.Environment.license.url;
			}
			
			if (this.project.Environment.license.extensions) {
				RAMLExporter._addExtensions(ramlDef, ramlDef['(oas-info)'].license, this.project.Environment.license.extensions);
			}
			
		}
		
		let docs = this._mapTextSections(this.project.Texts);
		if (docs.length) {
			ramlDef.documentation = ramlDef.documentation || [];
			ramlDef.documentation = ramlDef.documentation.concat(docs);
		}
		
		let slSecuritySchemes = this.project.Environment.SecuritySchemes;
		let securitySchemes = this._mapSecurityScheme(slSecuritySchemes);
		
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
		
		let endpoints = this.project.Endpoints;
		
		// Collect endpoints ids from environment resourcesOrder
		let orderedIds = env.resourcesOrder.docs.reduce(function (ids, group) {
			return ids.concat(_.map(_.filter(group.items, {type: 'endpoints'}), '_id'));
		}, []);
		
		// Sort endpoints similar to resourcesOrder items order
		endpoints.sort(function (a, b) {
			return orderedIds.indexOf(a._id) < orderedIds.indexOf(b._id) ? -1 : 1;
		});
		
		for (let i in endpoints) {
			if (!endpoints.hasOwnProperty(i)) continue;
			let endpoint = endpoints[i];
			
			let method = {};
			if (endpoint.extensions) {
				RAMLExporter._addExtensions(ramlDef, method, endpoint.extensions);
			}
			
			this.setMethodDisplayName(method, endpoint.operationId || endpoint.Name);
			if (endpoint.Description) {
				method.description = endpoint.Description;
			}
			if (endpoint.Summary) {
				this.hasSummary = true;
				method['(oas-summary)'] = endpoint.Summary;
			}
			
			let protocols = RAMLExporter.mapProtocols(endpoint.protocols);
			if (!_.isEmpty(protocols)) {
				method.protocols = protocols;
			}
			
			let is = RAMLExporter._mapEndpointTraits(this.project.Traits, endpoint);
			if (is.length) {
				method.is = is;
			}
			
			if (_.toLower(endpoint.Method) === 'post' ||
				_.toLower(endpoint.Method) === 'put' ||
				_.toLower(endpoint.Method) === 'patch') {
				let mimeType = RAMLExporter.getDefaultMimeType(endpoint.Consumes, ramlDef.mediaType);
				let body = this._mapRequestBody(endpoint.Body, mimeType);
				if (!_.isEmpty(body)) {
					method.body = body;
				}
			}
			
			method.headers = this._mapNamedParams(endpoint.Headers);
			
			let mimeType = RAMLExporter.getDefaultMimeType(endpoint.Produces, ramlDef.mediaType);
			let responses = this._mapResponseBody(endpoint.Responses, mimeType);
			if (!_.isEmpty(responses)) {
				if (responses.default) {
					this.hasResponsesDefault = true;
					method['(oas-responses-default)'] = responses.default;
					delete responses.default;
				}
				if (!_.isEmpty(responses)) {
					method.responses = responses;
				}
			}
			
			method.queryParameters = this._mapURIParams(endpoint.QueryString);
			
			method.uriParameters = this._mapURIParams(endpoint.PathParams);
			
			if (endpoint.securedBy) {
				let rsecuredBy = [];
				if (endpoint.securedBy.oauth2) {
					for (let index in slSecuritySchemes.oauth2) {
						if (!slSecuritySchemes.oauth2.hasOwnProperty(index)) continue;
						let current = slSecuritySchemes.oauth2[index];
						if (current.name === endpoint.securedBy.oauth2.name) {
							let securedName = current.name || 'oauth2';
							if (!_.isEmpty(endpoint.securedBy.oauth2.scope)) {
								let scopes = {};
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
					for (let index in slSecuritySchemes.basic) {
						if (!slSecuritySchemes.basic.hasOwnProperty(index)) continue;
						let current = slSecuritySchemes.basic[index];
						if (endpoint.securedBy.basic.name === current.name) {
							rsecuredBy.push(current.name);
						}
					}
				}
				if (endpoint.securedBy.apiKey) {
					if (slSecuritySchemes.apiKey) {
						if (!_.isEmpty(slSecuritySchemes.apiKey.headers)) {
							for (let index in slSecuritySchemes.apiKey.headers) {
								if (!slSecuritySchemes.apiKey.headers.hasOwnProperty(index)) continue;
								let current = slSecuritySchemes.apiKey.headers[index];
								if (current.externalName === endpoint.securedBy.apiKey.name) {
									rsecuredBy.push(current.externalName);
								}
							}
						}
						if (!_.isEmpty(slSecuritySchemes.apiKey.queryString)) {
							for (let index in slSecuritySchemes.apiKey.queryString) {
								if (!slSecuritySchemes.apiKey.queryString.hasOwnProperty(index)) continue;
								let current = slSecuritySchemes.apiKey.queryString[index];
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
			
			let uriParts = endpoint.Path.split('/');
			uriParts.splice(0, 1);
			ramlDef.addMethod(ramlDef, uriParts, endpoint.Method, method, this.project.getPathParamRef(endpoint.Path));
			
			if (endpoint.Tags && !_.isEmpty(endpoint.Tags)) {
				this.hasTags = true;
				method['(oas-tags)'] = endpoint.Tags;
			}
			
			if (endpoint.Deprecated) {
				this.hasDeprecated = true;
				method['(oas-deprecated)'] = endpoint.Deprecated;
			}
			
			if (endpoint.ExternalDocs) {
				this.hasExternalDocs = true;
				method['(oas-externalDocs)'] = {
					'description': endpoint.ExternalDocs.description,
					'url': endpoint.ExternalDocs.url
				};
			}
			
			if (endpoint.responses.extensions) {
				RAMLExporter._addExtensions(ramlDef, method.responses, endpoint.responses.extensions);
			}
			
			for (let i in method) {
				if (!method.hasOwnProperty(i)) continue;
				let value = method[i];
				if (typeof value === 'object') RAMLExporter._addInnerExtensions(ramlDef, value);
			}
			
			for (let i in method.responses) {
				if (!method.responses.hasOwnProperty(i)) continue;
				let response = method.responses[i];
				RAMLExporter._addExampleExtensions(ramlDef, response.body);
			}
		}
		
		let schemas = this.project.Schemas;
		if (schemas && schemas.length > 0) {
			this.addSchema(ramlDef, this.mapSchema(schemas));
		}
		
		for (let i in schemas) {
			if (!schemas.hasOwnProperty(i)) continue;
			let schema = schemas[i];
			if (typeof schema === 'object') {
				let object = schema.definition;
				RAMLExporter._addInnerExtensions(ramlDef, object);
				RAMLExporter._addInnerExternalDocs(ramlDef, object);
			}
		}
		
		if (this.project.Traits && this.project.Traits.length > 0) {
			let traits = this._mapParametersTraits(this.project.Traits);
			if (!_.isEmpty(traits)) {
				ramlDef.traits = traits;
			}
		}
		
		//export responses
		if (this.project.Traits && this.project.Traits.length > 0) {
			let responses = this._mapResponsesTraits(this.project.Traits);
			if (!_.isEmpty(responses)) {
				ramlDef['(oas-responses)'] = responses;
				if (!ramlDef.annotationTypes) {
					ramlDef.annotationTypes = {};
				}
				ramlDef.annotationTypes['oas-responses'] = 'any';
			}
		}
		
		// Clean empty field in definition
		for (let field in ramlDef) {
			if (ramlDef.hasOwnProperty(field) && !ramlDef[field]) {
				delete ramlDef[field];
			}
		}
		
		this._annotationsSignature(ramlDef);
		RAMLExporter._addExtensions(ramlDef, ramlDef, this.project.extensions);
		this.data = ramlDef;
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
		
		for (let key in tags) {
			if (!tags.hasOwnProperty(key)) continue;
			
			ramlDef['(oas-tags-definition)'].push(tags[key]);
		}
	}
	
	// allowedTargets?
	static _addExtensions(ramlDef, ramlObject, extensions) {
		for (let key in extensions) {
			if (!extensions.hasOwnProperty(key)) continue;
			
			if (ramlObject.hasOwnProperty(key)) delete ramlObject[key];
			let annotationKey = (key === 'example') ? 'responses-'.concat(key) : key;
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
		for (let key in object) {
			if (!object.hasOwnProperty(key)) continue;
			let type = object[key];
			if (!type.hasOwnProperty('example')) continue;
			let value = type['example'];
			if (typeof value === 'string') RAMLExporter._addExtensions(ramlDef, type, {'example':value});
		}
	}
	
	static _addInnerExtensions(ramlDef, object) {
		let extensions = {};
		let innerObjects = {};
		for (let key in object) {
			if (!object.hasOwnProperty(key)) continue;
			let value = object[key];
			if (_.startsWith(key, 'x-')) {
				extensions[key] = value;
			} else if (typeof value === 'object') {
				innerObjects[key] = value;
			}
		}
		if (!_.isEmpty(extensions)) RAMLExporter._addExtensions(ramlDef, object, extensions);
		for (let key in innerObjects) {
			if (!innerObjects.hasOwnProperty(key)) continue;
			let obj = innerObjects[key];
			RAMLExporter._addInnerExtensions(ramlDef, obj);
		}
	}
	
	static _addInnerExternalDocs(ramlDef, object) {
		let innerObjects = {};
		for (let key in object) {
			if (!object.hasOwnProperty(key)) continue;
			let value = object[key];
			if (key === 'externalDocs') RAMLExporter._addExtensions(ramlDef, object, {'externalDocs':value});
			else if (typeof value === 'object') innerObjects[key] = value;
		}
		for (let key in innerObjects) {
			if (!innerObjects.hasOwnProperty(key)) continue;
			let obj = innerObjects[key];
			RAMLExporter._addInnerExternalDocs(ramlDef, obj);
		}
	}
	
	_unescapeYamlIncludes(yaml) {
		let start = yaml.indexOf("'!include ");
		if (start == -1) return yaml;
		let end = yaml.indexOf("'", start + 1);
		if (end == -1) return yaml;
		return yaml.substring(0, start) + yaml.substring(start + 1, end) + this._unescapeYamlIncludes(yaml.substring(end + 1));
	}
	
	_getData(format) {
		switch (format) {
			case 'yaml': {
				let yaml = this._unescapeYamlIncludes(YAML.dump(jsonHelper.parse(JSON.stringify(this.Data)), {lineWidth: -1}));
				return '#%RAML ' + this.version() + '\n' + yaml;
			}
			default:
				throw Error('RAML doesn not support ' + format + ' format');
		}
	}
	
	convertRequiredFromProperties(object, insideProperties) {
		for (let id in object) {
			if (!object.hasOwnProperty(id)) continue;
			let val = object[id];
			
			if (val && (typeof val) === 'object' && id !== 'required') {
				this.convertRequiredFromProperties(val, id === 'properties');
			}
			if (id === 'properties' && !insideProperties) {
				for (let propId in object.properties) {
					if (!object.properties.hasOwnProperty(propId)) continue;
					let property = object.properties[propId];
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
			for (let j in object.required) {
				if (!object.required.hasOwnProperty(j)) continue;
				let requiredParam = object.required[j];
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
