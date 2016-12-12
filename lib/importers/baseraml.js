const parser = require('raml-1-parser'),
	Endpoint = require('../entities/endpoint'),
	Importer = require('./importer'),
	Project = require('../entities/project'),
	jsonHelper = require('../utils/json'),
	ramlHelper = require('../helpers/raml'),
	url = require('url'),
	_ = require('lodash');

const toJSONOptions = {
	serializeMetadata: false
};

//TODO multi file support isn't justified
class RAML extends Importer {
	constructor() {
		super();
		this.schemas = [];
	}
	
	_getSecuritySchemeSettingsByName = function (schemeName) {
		let securitySchemes = this.data.securitySchemes;
		for (let i in securitySchemes) {
			if (!securitySchemes.hasOwnProperty(i)) continue;
			
			let entries = _.entries(securitySchemes[i]);
			for (let index = 0; index < entries.length; index++) {
				let entry = entries[index];
				let key = entry[0];
				let value = entry[1];
				
				if (schemeName === key) {
					return value;
				}
			}
		}
	};
	
	_mapSecuritySchemes = function (securitySchemes) {
		let slSecurityScheme = {};
		for (let i in securitySchemes) {
			if (!securitySchemes.hasOwnProperty(i)) continue;
			let securityScheme = securitySchemes[i];
			for (let name in securityScheme) {
				if (!securityScheme.hasOwnProperty(name)) continue;
				let scheme = securityScheme[name];
				switch (scheme.type) {
					case 'OAuth 2.0':
						let oauth = {
							name: name, //not used in stoplight designer
							authorizationUrl: scheme.settings.authorizationUri || '',
							tokenUrl: scheme.settings.accessTokenUri || '',
							scopes: []
						};
						if (Array.isArray(scheme.scopes)) {
							for (let scopeIndex in scheme.scopes) {
								if (!scheme.scopes.hasOwnProperty(scopeIndex)) continue;
								oauth.scopes.push({
									name: scheme.scopes[scopeIndex],
									value: ''
								});
							}
						}
						//authorizationGrants are flow, only one supported in stoplight
						let flow = !_.isEmpty(scheme.settings.authorizationGrants) ? scheme.settings.authorizationGrants[0] : 'code';
						
						switch (flow) {
							case 'code':
								oauth.flow = 'accessCode';
								break;
							case 'token':
								oauth.flow = 'implicit';
								break;
							case 'owner':
								oauth.flow = 'application';
								break;
							case 'credentials':
								oauth.flow = 'password';
								break;
						}
						slSecurityScheme['oauth2'] = oauth;
						break;
					case 'Basic Authentication':
						slSecurityScheme['basic'] = {
							name: name,
							value: '',
							description: scheme.description || ''
						};
						break;
					default:
					//TODO not supported
				}
			}
		}
		return slSecurityScheme;
	};
	
	_mapRequestBody = function (methodBody) {
		return this.mapRequestBody(methodBody);
	};
	
	_mapQueryParameters = function (queryParameters) {
		let queryString = {type: 'object', properties: {}, required: []};
		for (let key in queryParameters) {
			if (!queryParameters.hasOwnProperty(key)) continue;
			let qp = queryParameters[key];
			queryString.properties[key] = ramlHelper.setParameterFields(qp, {});
			this._convertRequiredToArray(qp, key, queryString.required);
		}
		return queryString;
	};
	
	_mapQueryString = function (queryString) {
		let result = queryString;
		if (queryString.type) {
			result['x-raml-type'] = _.isArray(queryString.type) && queryString.type.length == 1 ? queryString.type[0] : queryString.type;
			queryString.type = 'string';
		}
		
		if (queryString.properties) {
			queryString.required = [];
		}
		for (let paramId in queryString.properties) {
			if (!queryString.properties.hasOwnProperty(paramId)) continue;
			let param = queryString.properties[paramId];
			this._convertRequiredToArray(param, paramId, queryString.required);
		}
		
		return result;
	};
	
	_mapRequestHeaders = function (data) {
		return this._mapQueryParameters(data);
	};
	
	_mapURIParams = function (uriParams) {
		let pathParams = {type: 'object', properties: {}, required: []};
		
		for (let i in uriParams) {
			if (!uriParams.hasOwnProperty(i)) continue;
			let key = uriParams[i];
			
			pathParams.properties[key.name] = {
				description: key.displayName || key.description || '',
				type: key.type || 'string'
			};
			this._convertRequiredToArray(key, key.name, pathParams.required);
			this._addAnnotations(key, pathParams.properties[key.name]);
		}
		return pathParams;
	};
	
	_convertRequiredToArray = function (object, key, required) {
		if (!object.hasOwnProperty('required') || object.required === true) {
			required.push(key);
		}
		delete object.required;
	};
	
	_mapResponseBody = function (responses) {
		let data = [];
		for (let code in responses) {
			if (!responses.hasOwnProperty(code)) continue;
			let response = responses[code];
			let result = this._mapRequestBody(response.body);
			result.codes = [response.code];
			if (result.body) {
				result.body = jsonHelper.cleanSchema(result.body);
			}
			
			if (result.example) {
				result.example = jsonHelper.stringify(result.example, 4);
			}
			
			if (response.description) {
				result.description = jsonHelper.stringify(response.description);
			}
			data.push(result);
		}
		return data;
	};
	
	_mapSchema = function (schemData) {
		return this.mapSchema(schemData);
	};
	
	isValidRefValues = function (values) {
		if (!_.isArray(values)) {
			return this.isValidRefValue(values);
		}
		let result = true;
		for (let index = 0; index < values.length && result == true; index++) {
			result = this.isValidRefValue(values[index]);
		}
		
		return result;
	};
	
	isValidRefValue = function (value) {
		return typeof value === 'string' && ramlHelper.getScalarTypes.indexOf(value) < 0 && value !== 'object';
	};
	
	// from type=type1 & schema=type1 to ref=type1
	convertRefToModel = function (object) {
		// if the object is a string, that means it's a direct ref/type
		if (typeof object === 'string') {
			return {
				$ref: '#/definitions/' + object
			};
		}
		
		for (let id in object) {
			let isType = id == 'type';
			
			if (!object.hasOwnProperty(id)) continue;
			if (isType && _.isArray(object[id]) && object[id].length == 1) {
				object[id] = object[id][0];
			}
			let val = object[id];
			if (!val) continue;
			
			if (isType && this.isValidRefValues(val)) {
				object.ref = val;
				delete object[id];
			}
			else if (typeof val === 'object') {
				if (val.type && val.type == 'date-only') {
					object[id] = {
						type: 'string',
						format: 'date'
					};
				} else if (val.type && val.type == 'datetime') {
					object[id] = {
						type: 'string',
						format: 'date-time'
					};
				}
				else if (id == 'structuredExample' || id == 'fixedFacets') { //delete garbage
					delete object[id];
				}
				else {
					if (id == 'xml') { //no process xml object
						object[id] = val;
					} else {
						object[id] = this.convertRefToModel(val);
					}
				}
			} else if (id == 'name') { //delete garbage
				delete object[id];
			}
		}
		
		return object;
	};
	
	mapMimeTypes = function (body, skip) {
		let result = [];
		let skipMimeTypes = [];
		for (let i in skip) {
			if (skip[i].value) {
				skipMimeTypes.push(skip[i].value);
			}
		}
		
		for (let i in body) {
			let b = body[i];
			if (b.name) {
				let mimeType = b.name;
				if (skipMimeTypes.indexOf(mimeType) === -1) {
					result.push(mimeType);
				}
			}
		}
		return _.uniq(result);
	};
	
	_mapEndpoint = function (resource, baseURI, pathParams) {
		if (resource.uriParameters) {
			pathParams = _.merge(pathParams, this._mapURIParams(resource.uriParameters));
		}
		
		let methods = resource.methods;
		for (let i in methods) {
			if (!methods.hasOwnProperty(i)) continue;
			let method = methods[i];
			
			let summary = method.summary ? method.summary : '';
			let endpoint = new Endpoint(summary);
			endpoint.Method = method.method;
			endpoint.Path = baseURI + resource.relativeUri;
			endpoint.Description = method.description ? jsonHelper.stringify(method.description) : '';
			
			endpoint.SetOperationId(method.displayName, endpoint.Method, endpoint.Path);
			
			if (method.body) {
				let c = this.mapMimeTypes(method.body, this.data.mediaType);
				endpoint.Consumes = c.length > 0 ? c : null;
				endpoint.Body = this._mapRequestBody(method.body);
			}
			
			if (method.queryParameters) {
				endpoint.QueryString = this._mapQueryParameters(method.queryParameters);
			} else if (method.queryString) {
				endpoint.QueryString = this._mapQueryString(method.queryString);
			}
			
			if (method.headers) {
				endpoint.Headers = this._mapRequestHeaders(method.headers);
			}
			
			if (method.responses) {
				let produces = [];
				for (let code in method.responses) {
					if (!method.responses[code] || !method.responses[code].body) {
						continue;
					}
					produces = produces.concat(this.mapMimeTypes(method.responses[code].body, this.data.mediaType));
				}
				let p = _.uniq(produces);
				endpoint.Produces = p.length > 0 ? p : null;
				endpoint.Responses = this._mapResponseBody(method.responses);
			}
			
			endpoint.traits = [];
			let isMethod = method.is || resource.is;
			if (isMethod) {
				if (isMethod instanceof Array) {
					endpoint.traits = isMethod;
				} else if (isMethod instanceof Object) {
					endpoint.traits = Object.keys(isMethod);
				}
			}
			
			endpoint.PathParams = pathParams;
			
			//endpoint security
			let securedBy = method.securedBy;
			if (Array.isArray(securedBy)) {
				endpoint.securedBy = {};
				for (let si in securedBy) {
					if (!securedBy.hasOwnProperty(si)) continue;
					
					if (typeof securedBy[si] === 'string') {
						this._assignSecuredByToEndpoint(endpoint, securedBy[si]);
					}
					else {
						let entries = _.entries(securedBy[si]);
						
						for (let index = 0; index < entries.length; index++) {
							let entry = entries[index];
							this._assignSecuredByToEndpoint(endpoint, entry[0]);
						}
					}
				}
			}
			
			//add annotations
			this._addAnnotations(method, endpoint);
			
			//TODO endpoint security
			
			this.project.addEndpoint(endpoint);
		}
		
		let resources = resource.resources;
		if (resources && resources.length > 0) {
			for (let j = 0; j < resources.length; j++) {
				this._mapEndpoint(resources[j], baseURI + resource.relativeUri, pathParams);
			}
		}
	};
	
	_assignSecuredByToEndpoint = function (endpoint, key) {
		let schemeSettings = this._getSecuritySchemeSettingsByName(key);
		switch (schemeSettings.type) {
			case 'OAuth 2.0':
				endpoint.securedBy['oauth2'] = true;
				break;
			case 'Basic Authentication':
				endpoint.securedBy['basic'] = true;
				break;
			case 'Pass Through':
				endpoint.securedBy['apiKey'] = true;
			default:
				//TODO not supported
				break;
		}
	};
	
	loadFile = function (filePath, options) {
		let me = this;
		let parseOptions = {
			attributeDefaults: false
		};
		if (options && options.hasOwnProperty('validate') && options.validate === true) {
			parseOptions.rejectOnErrors = true;
		}
		let mergedOptions = _.merge(parseOptions, options || {});
		
		return new Promise(function (resolve, reject) {
			parser.loadApi(filePath, mergedOptions).then(function (api) {
				try {
					me.data = api.expand(true).toJSON(toJSONOptions);
					resolve();
				}
				catch (e) {
					reject(e);
				}
			}).catch(function (err) {
				reject(err);
			});
		});
	};
	
	loadData = function (data, options) {
		let me = this;
		let parseOptions = {
			attributeDefaults: false
		};
		if (options && options.hasOwnProperty('validate') && options.validate === true) {
			parseOptions.rejectOnErrors = true;
		}
		let mergeOptions = _.merge(parseOptions, options);
		
		return new Promise(function (resolve, reject) {
			try {
				let parsedData = parser.parseRAMLSync(data, mergeOptions);
				if (parsedData.name === 'Error') {
					reject(error);
				} else {
					me.data = parsedData.expand(true).toJSON(toJSONOptions);
					resolve();
				}
			} catch (e) {
				reject(e);
			}
		});
	};
	
	_mapHost = function () {
		let parsedURL = url.parse(this.data.baseUri || '');
		this.project.Environment.Host = (parsedURL.protocol && parsedURL.host) ? (parsedURL.protocol + '//' + parsedURL.host) : null;
		this.project.Environment.BasePath = parsedURL.path;
	};
	
	_mapTraits = function (traitGroups) {
		let slTraits = [];
		
		for (let i in traitGroups) {
			if (!traitGroups.hasOwnProperty(i)) continue;
			let traitGroup = traitGroups[i];
			
			for (let k in traitGroup) {
				if (!traitGroup.hasOwnProperty(k)) continue;
				let trait = traitGroup[k];
				let slTrait = {
					_id: k,
					name: k,
					description: '',
					request: {},
					responses: []
				};
				
				if (!_.isEmpty(trait.usage)) {
					slTrait.description = jsonHelper.stringify(trait.usage);
				} else {
					delete slTrait.description;
				}
				
				if (trait.queryParameters) {
					slTrait.request.queryString = this._mapQueryParameters(trait.queryParameters);
				}
				
				if (trait.headers) {
					slTrait.request.headers = this._mapRequestHeaders(trait.headers);
				}
				
				if (trait.responses) {
					slTrait.responses = this._mapResponseBody(trait.responses);
				} else {
					delete slTrait.responses;
				}
				
				slTraits.push(slTrait);
				
			}
		}
		
		return slTraits;
	};
	
	_addAnnotations = function (source, target) {
		if (!source.annotations) return;
		
		let annotations = source.annotations;
		for (let i in annotations) {
			if (!annotations.hasOwnProperty(i)) continue;
			let value = annotations[i];
			let key = 'x-annotation-' + value.name;
			target[key] = value.structuredValue;
		}
		
		if (target.annotations) delete target.annotations;
	};
	
	_import = function () {
		try {
			this.project = new Project(this.data.title);
			this.project.Environment.Version = this.data.version;
			if (!this.project.Environment.Version) {
				delete this.project.Environment.Version;
			}
			
			// TODO set project description from documentation
			// How to know which documentation describes the project briefly?
			this.description(this.project, this.data);
			
			this._mapHost();
			
			if (!_.isEmpty(this.data.protocols)) {
				this.project.Environment.Protocols = this.data.protocols;
				for (let i in this.project.Environment.Protocols) {
					if (!this.project.Environment.Protocols.hasOwnProperty(i)) continue;
					this.project.Environment.Protocols[i] = this.project.Environment.Protocols[i].toLowerCase();
				}
			}
			
			let mimeTypes = [];
			let mediaType = this.data.mediaType;
			if (mediaType) {
				if (!_.isArray(mediaType)) {
					mediaType = [mediaType];
				}
				for (let i in mediaType) {
					if (!mediaType.hasOwnProperty(i)) continue;
					if (mediaType[i]) {
						mimeTypes.push(mediaType[i]);
					}
				}
			}
			if (mimeTypes.length) {
				this.project.Environment.Produces = mimeTypes;
				this.project.Environment.Consumes = mimeTypes;
			}
			
			this.project.Environment.SecuritySchemes = this._mapSecuritySchemes(this.data.securitySchemes);
			
			let resources = this.data.resources;
			if (!_.isEmpty(resources)) {
				for (let i = 0; i < resources.length; i++) {
					this._mapEndpoint(resources[i], '', {});
				}
			}
			
			let schemas = this._mapSchema(this.getSchema(this.data));
			for (let s in schemas) {
				if (!schemas.hasOwnProperty(s)) continue;
				this.project.addSchema(schemas[s]);
			}
			
			this.project.traits = this._mapTraits(this.data.traits);
		} catch (e) {
			console.error('raml#import', e);
			throw e;
		}
	};
	
	description = function (project, data) {
		throw new Error('description method not implemented');
	};
	
	mapRequestBody = function (methodBody) {
		throw new Error('mapRequestBody method not implemented');
	};
	
	mapSchema = function (schema) {
		throw new Error('mapSchema method not implemented');
	};
	
	getSchema = function (data) {
		throw new Error('getSchema method not implemented');
	};
}

module.exports = RAML;
