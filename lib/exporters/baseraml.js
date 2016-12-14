const _ = require('lodash'),
	Exporter = require('./exporter'),
	ramlHelper = require('../helpers/raml'),
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
		
		let protocols = RAML.mapProtocols(env.Protocols);
		if (!_.isEmpty(protocols)) {
			this.protocols = protocols;
		}
	};
	
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
				resource.is = pathParamsRef;
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
	};
}

class RAML extends Exporter {
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
	}
	
	_mapSecurityScheme(slSecuritySchemes) {
		let ramlSecuritySchemes = {};
		
		if (slSecuritySchemes.hasOwnProperty('oauth2')) {
			let name = slSecuritySchemes.oauth2.name || 'oauth2';
			// missing describedBy, description
			
			ramlSecuritySchemes[name] = {
				type: 'OAuth 2.0',
				settings: {
					authorizationUri: slSecuritySchemes.oauth2.authorizationUrl || undefined,
					accessTokenUri: slSecuritySchemes.oauth2.tokenUrl || '',
					authorizationGrants: this.mapAuthorizationGrants(slSecuritySchemes.oauth2.flow)
				}
			};
			if (slSecuritySchemes.oauth2.description) {
				ramlSecuritySchemes[name]['description'] = slSecuritySchemes.oauth2.description;
			}
			
			let scopes = [];
			if (slSecuritySchemes.oauth2.scopes && !_.isEmpty(slSecuritySchemes.oauth2.scopes)) {
				for (let index in slSecuritySchemes.oauth2.scopes) {
					if (!slSecuritySchemes.oauth2.scopes.hasOwnProperty(index)) continue;
					let scope = slSecuritySchemes.oauth2.scopes[index].name;
					scopes.push(scope);
				}
				
				ramlSecuritySchemes[name]['settings']['scopes'] = scopes;
			}
		}
		
		if (slSecuritySchemes.hasOwnProperty('basic')) {
			let basicName = slSecuritySchemes.basic.name;
			if (basicName) {
				ramlSecuritySchemes[basicName] = {
					type: 'Basic Authentication',
					description: slSecuritySchemes.basic.description
				};
			}
		}
		
		if (slSecuritySchemes.hasOwnProperty('apiKey')) {
			let name = null;
			let content = {};
			let description = null;
			
			// add header auth
			if (!_.isEmpty(slSecuritySchemes.apiKey.headers)) {
				name = slSecuritySchemes.apiKey.headers[0].externalName;
				description = slSecuritySchemes.apiKey.headers[0].description;
				
				content.headers = {};
				for (let i in slSecuritySchemes.apiKey.headers) {
					if (!slSecuritySchemes.apiKey.headers.hasOwnProperty(i)) continue;
					
					let q = slSecuritySchemes.apiKey.headers[i];
					let keyName = q.name;
					content.headers[keyName] = {
						type: 'string'
					};
				}
			}
			
			// add query auth
			if (!_.isEmpty(slSecuritySchemes.apiKey.queryString)) {
				name = slSecuritySchemes.apiKey.queryString[0].externalName;
				description = slSecuritySchemes.apiKey.queryString[0].description;
				
				content.queryParameters = {};
				for (let i in slSecuritySchemes.apiKey.queryString) {
					if (!slSecuritySchemes.apiKey.queryString.hasOwnProperty(i)) continue;
					
					let q = slSecuritySchemes.apiKey.queryString[i];
					let keyName = q.name;
					content.queryParameters[keyName] = {
						type: 'string'
					};
				}
			}
			
			if (!_.isEmpty(content)) {
				ramlSecuritySchemes[name || 'apiKey'] = {
					type: this.getApiKeyType(),
					describedBy: content,
					description: description
				};
			}
		}
		
		return this.mapSecuritySchemes(ramlSecuritySchemes);
	};
	
	static _validateParam(params) {
		let acceptedTypes = ['string', 'number', 'integer', 'date', 'boolean', 'file', 'array', 'datetime'];
		for (let key in params) {
			if (!params.hasOwnProperty(key)) continue;
			let param = params[key];
			for (let prop in param) {
				if (!param.hasOwnProperty(prop)) continue;
				switch (prop) {
					case 'type':
						let type = params[key].type;
						if (acceptedTypes.indexOf(type) < 0) {
							//not supported type, delete param
							delete params[key];
							continue;
						}
						break;
					case 'enum':
					case 'pattern':
					case 'minLength':
					case 'maxLength':
						if (params[key].type !== 'string') {
							delete params[key][prop];
						}
						break;
					case 'minimum':
					case 'maximum':
						let typeLowercase = _.toLower(params[key].type);
						if (typeLowercase !== 'integer' && typeLowercase !== 'number') {
							delete params[key][prop];
						}
						break;
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
	};
	
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
			case 'application/x-www-form-urlencoded':
				let parsedBody = jsonHelper.parse(bodyData.body);
				body[mimeType] = this.mapRequestBodyForm(this.convertRefFromModel(parsedBody));
				break;
			default:
			//unsuported format
			//TODO
		}
		
		if (bodyData.description) {
			body[mimeType].description = bodyData.description;
		}
		
		return body;
	};
	
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
		return RAML._validateParam(newParams);
	};
	
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
			}
		}
		
		return responses;
	};
	
	//TODO: Stoplight doesn't support seperate path params completely yet
	_mapURIParams(pathParamData) {
		if (!pathParamData.properties || _.isEmpty(pathParamData.properties)) {
			return;
		}
		
		let pathParams = {};
		for (let key in pathParamData.properties) {
			if (!pathParamData.properties.hasOwnProperty(key)) continue;
			let prop = pathParamData.properties[key];
			
			pathParams[key] = ramlHelper.setParameterFields(prop, {});
			if (prop.description) {
				pathParams[key].displayName = prop.description;
			}
			if (prop.items) {
				pathParams[key].items = prop.items;
			}
			
			if (prop.format) {
				pathParams[key].format = prop.format;
			}
			
			pathParams[key].type = pathParams[key].type || 'string';
			
			//facets
			RAML._addFacetsDeclaration(prop, pathParams[key]);
		}
		
		return RAML._validateParam(pathParams);
	};
	
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
	};
	
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
	};
	
	// from ref=type1 to type=type1
	// from $ref=#/definitions/type1 to type=type1
	// from $ref=definitions/type1 to !include definitions/type1
	convertRefFromModel(object) {
		for (let id in object) {
			if (object.hasOwnProperty(id)) {
				let val = object[id];
				if (id == '$ref') {
					if (val.indexOf('#/') == 0) {
						object.type = val.replace('#/definitions/', '');
					} else {
						object.type = '!include ' + val.replace('#/', '#');
					}
					delete object[id];
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
				} else if (val && (typeof val) === 'object') {
					if (val.type == 'string') {
						if (val.format == 'byte' || val.format == 'binary' || val.format == 'password') {
							object[id]['type'] = 'string';
							val['facets'] = {'format': 'string'};
						} else if (val.format == 'date') {
							object[id]['type'] = 'date-only';
							delete object[id].format;
						} else if (val.format == 'date-time') {
							object[id]['type'] = 'datetime';
							object[id]['format'] = 'rfc3339';
						}
						else {
							if (val.format && ramlHelper.getValidFormat.indexOf(val.format) < 0) {
								val['facets'] = {'format': 'string'};
							}
						}
						if (val.readOnly) {
							val['facets'] = {'readOnly?': 'boolean'};
						}
					} else {
						object[id] = this.convertRefFromModel(val);
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
				}
			}
		}
		
		return object;
	};
	
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
	};
	
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
			}
			
			try {
				let headers = jsonHelper.parse(slTrait.request.headers);
				if (!jsonHelper.isEmptySchema(headers)) {
					trait.headers = this._mapNamedParams(headers);
				}
			} catch (e) {
			}
			
			try {
				let formData = jsonHelper.parse(slTrait.request.formData);
				if (!jsonHelper.isEmptySchema(formData)) {
					trait.body = this._mapRequestBody(formData, 'multipart/form-data');
				}
			} catch (e) {
			}
			
			try {
				let body = jsonHelper.parse(slTrait.request.body);
				if (!jsonHelper.isEmptySchema(body)) {
					trait.body = this._mapRequestBody(body, 'application/json');
				}
			} catch (e) {
			}
			
			
			if (!_.isEmpty(slTrait.responses)) {
				//ignore responses as traits
				continue;
			}
			
			this.addTrait(slTrait.name, trait, traits);
		}
		
		return traits;
	};
	
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
			}
		}
		
		return responses;
	};
	
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
	};
	
	static getDefaultMimeType(mimeType, defMimeType) {
		let mt = (mimeType && mimeType.length > 0) ? mimeType[0] : null;
		if (!mt) {
			if (_.isArray(defMimeType) && defMimeType.length) {
				mt = defMimeType[0];
			} else if (_.isString(defMimeType) && defMimeType !== '') {
				mt = defMimeType;
			}
		}
		return mt;
	};
	
	_annotationsSignature(ramlDef) {
		if (this.hasTags || this.hasDeprecated || this.hasExternalDocs || this.hasInfo ||
			this.hasSummary || this.hasSchemaTitle || this.hasBodyName || this.hasResponsesDefault) {
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
				ramlDef.annotationTypes['oas-responses-default'] = 'any';
			}
		}
	};
	
	_export() {
		let env = this.project.Environment;
		let ramlDef = new RAMLDefinition(this.project.Name, env);
		
		ramlDef.mediaType = this.mapMediaType(env.Consumes, env.Produces);
		this.description(ramlDef, this.project);
		
		if (this.project.tags) {
			RAML._addTags(ramlDef, this.project.tags);
		}
		
		if (this.project.Environment.extensions) {
			if (!ramlDef['(oas-info)']) {
				ramlDef['(oas-info)'] = {};
			}
			RAML._addExtensions(ramlDef, ramlDef['(oas-info)'], this.project.Environment.extensions);
		}
		
		if (this.project.Environment.ExternalDocs) {
			this.hasExternalDocs = true;
			ramlDef['(oas-externalDocs)'] = {
				'description': this.project.Environment.ExternalDocs.description,
				'url': this.project.Environment.ExternalDocs.url
			};
			
			if (this.project.Environment.ExternalDocs.extensions) {
				RAML._addExtensions(ramlDef, ramlDef['(oas-externalDocs)'], this.project.Environment.ExternalDocs.extensions);
			}
		}
		
		if (this.project.Environment.contactInfo || this.project.Environment.termsOfService || this.project.Environment.license) {
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
				RAML._addExtensions(ramlDef, ramlDef['(oas-info)'].contact, this.project.Environment.contactInfo.extensions);
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
				RAML._addExtensions(ramlDef, ramlDef['(oas-info)'].license, this.project.Environment.license.extensions);
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
			RAML._addExtensions(ramlDef, ramlDef['(oas-paths)'], this.project.endpointExtensions);
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
				RAML._addExtensions(ramlDef, method, endpoint.extensions);
			}
			
			this.setMethodDisplayName(method, endpoint.operationId || endpoint.Name);
			if (endpoint.Description) {
				method.description = endpoint.Description;
			}
			if (endpoint.Summary) {
				this.hasSummary = true;
				method['(oas-summary)'] = endpoint.Summary;
			}
			
			let protocols = RAML.mapProtocols(endpoint.protocols);
			if (!_.isEmpty(protocols)) {
				method.protocols = protocols;
			}
			
			let is = RAML._mapEndpointTraits(this.project.Traits, endpoint);
			if (is.length) {
				method.is = is;
			}
			
			if (_.toLower(endpoint.Method) === 'post' ||
				_.toLower(endpoint.Method) === 'put' ||
				_.toLower(endpoint.Method) === 'patch') {
				let mimeType = RAML.getDefaultMimeType(endpoint.Consumes, ramlDef.mediaType);
				let body = this._mapRequestBody(endpoint.Body, mimeType);
				if (!_.isEmpty(body)) {
					method.body = body;
				}
			}
			
			method.headers = this._mapNamedParams(endpoint.Headers);
			
			let mimeType = RAML.getDefaultMimeType(endpoint.Produces, ramlDef.mediaType);
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
					let securedName = slSecuritySchemes.oauth2.name || 'oauth2';
					if (!_.isEmpty(endpoint.securedBy.oauth2)) {
						let scopes = {};
						scopes[securedName] = {
							scopes: endpoint.securedBy.oauth2
						};
						rsecuredBy.push(scopes);
					}
					else {
						rsecuredBy.push(securedName);
					}
				}
				if (endpoint.securedBy.basic && slSecuritySchemes.basic.name) {
					rsecuredBy.push(slSecuritySchemes.basic.name);
				}
				if (endpoint.securedBy.apiKey) {
					if (slSecuritySchemes.apiKey) {
						if (!_.isEmpty(slSecuritySchemes.apiKey.headers)) {
							rsecuredBy.push(slSecuritySchemes.apiKey.headers[0].externalName);
						} else if (!_.isEmpty(slSecuritySchemes.apiKey.queryString)) {
							rsecuredBy.push(slSecuritySchemes.apiKey.queryString[0].externalName);
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
				RAML._addExtensions(ramlDef, method.responses, endpoint.responses.extensions);
			}
		}
		
		if (this.project.Schemas && this.project.Schemas.length > 0) {
			this.addSchema(ramlDef, this.mapSchema(this.project.Schemas));
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
		RAML._addExtensions(ramlDef, ramlDef, this.project.extensions);
		this.data = ramlDef;
	};
	
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
	};
	
	
	static _addExtensions(ramlDef, ramlObject, extensions) {
		for (let key in extensions) {
			if (!extensions.hasOwnProperty(key)) continue;
			
			ramlObject['(oas-' + key + ')'] = extensions[key];
			if (!ramlDef.annotationTypes) {
				ramlDef.annotationTypes = {};
			}
			ramlDef.annotationTypes['oas-' + key] = 'any';
		}
	};
	
	_unescapeYamlIncludes(yaml) {
		let start = yaml.indexOf("'!include ");
		if (start == -1) return yaml;
		let end = yaml.indexOf("'", start + 1);
		if (end == -1) return yaml;
		return yaml.substring(0, start) + yaml.substring(start + 1, end) + this._unescapeYamlIncludes(yaml.substring(end + 1));
	};
	
	_getData(format) {
		switch (format) {
			case 'yaml':
				let yaml = this._unescapeYamlIncludes(YAML.dump(jsonHelper.parse(JSON.stringify(this.Data)), {lineWidth: -1}));
				return '#%RAML ' + this.version() + '\n' + yaml;
			default:
				throw Error('RAML doesn not support ' + format + ' format');
		}
	};
	
	convertRequiredFromProperties(object) {
		for (let id in object) {
			if (!object.hasOwnProperty(id)) continue;
			let val = object[id];
			
			if (val && (typeof val) === 'object' && id !== 'required') {
				this.convertRequiredFromProperties(val);
			}
			if (id === 'properties') {
				for (let propId in object.properties) {
					if (!object.properties.hasOwnProperty(propId)) continue;
					let property = object.properties[propId];
					if (!RAML.checkRequiredProperty(object, propId)) {
						property.required = false;
					}
				}
				delete object.required;
			}
		}
	};
	
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
	};
	
	description(ramlDef, project) {
		throw new Error('description method not implemented');
	};
	
	version() {
		throw new Error('version method not implemented');
	};
	
	mapAuthorizationGrants(flow) {
		throw new Error('mapAuthorizationGrants method not implemented');
	};
	
	mapBody(bodyData, type) {
		throw new Error('mapBody method not implemented');
	};
	
	mapRequestBodyForm(bodyData) {
		throw new Error('mapRequestBodyForm method not implemented');
	};
	
	addSchema(ramlDef, schema) {
		throw new Error('addSchema method not implemented');
	};
	
	mapSchema(schema) {
		throw new Error('mapSchema method not implemented');
	};
	
	getApiKeyType() {
		throw new Error('getApiType method not implemented');
	};
	
	mapSecuritySchemes(securitySchemes) {
		throw new Error('mapSecuritySchemes method not implemented');
	};
	
	setMethodDisplayName(method, displayName) {
		throw new Error('setMethodDisplayName method not implemented');
	};
	
	initializeTraits() {
		throw new Error('initializeTraits method not implemented');
	};
	
	addTrait(id, trait, traits) {
		throw new Error('addTrait method not implemented');
	};
	
	mapMediaType(consumes, produces) {
		throw new Error('mapMediaType method not implemented');
	}
}

module.exports = RAML;
