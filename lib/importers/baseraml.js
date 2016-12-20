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
	
	_getSecuritySchemeSettingsByName(schemeName) {
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
	}
	
	static _mapSecuritySchemes(securitySchemes) {
		let slSecurityScheme = {};
		for (let i in securitySchemes) {
			if (!securitySchemes.hasOwnProperty(i)) continue;
			let securityScheme = securitySchemes[i];
			for (let name in securityScheme) {
				if (!securityScheme.hasOwnProperty(name)) continue;
				let scheme = securityScheme[name];
				switch (scheme.type) {
					case 'Pass Through' : {
						if (!slSecurityScheme['apiKey']) {
							slSecurityScheme['apiKey'] = [];
						}
						let apiKey = {
							name: name
						};
						if (scheme.describedBy) {
							if (scheme.describedBy.headers) {
								for (let index in scheme.describedBy.headers) {
									if (!scheme.describedBy.headers.hasOwnProperty(index)) continue;
									let current = scheme.describedBy.headers[index];
									apiKey.headers = [];
									apiKey.headers.push({
										name: current.name
									});
								}
							}
							if (scheme.describedBy.queryParameters) {
								for (let index in scheme.describedBy.queryParameters) {
									if (!scheme.describedBy.queryParameters.hasOwnProperty(index)) continue;
									let current = scheme.describedBy.queryParameters[index];
									apiKey.queryString = [];
									apiKey.queryString.push({
										name: current.name
									});
								}
							}
						}
						if (scheme.description) {
							apiKey.description = scheme.description;
						}
						
						slSecurityScheme['apiKey'].push(apiKey);
						break;
					}
					case 'OAuth 2.0': {
						if (!slSecurityScheme['oauth2']) {
							slSecurityScheme['oauth2'] = [];
						}
						let oauth = {
							name: name, //not used in stoplight designer
							authorizationUrl: scheme.settings.authorizationUri || '',
							tokenUrl: scheme.settings.accessTokenUri || '',
							scopes: []
						};
						if (Array.isArray(scheme.settings.scopes)) {
							for (let scopeIndex in scheme.settings.scopes) {
								if (!scheme.settings.scopes.hasOwnProperty(scopeIndex)) continue;
								oauth.scopes.push({
									name: scheme.settings.scopes[scopeIndex],
									value: ''
								});
							}
						}
						//authorizationGrants are flow, only one supported in stoplight
						let flow = !_.isEmpty(scheme.settings.authorizationGrants) ? scheme.settings.authorizationGrants[0] : 'code';
						
						switch (flow) {
							case 'authorization_code':
								oauth.flow = 'accessCode';
								break;
							case 'implicit':
								oauth.flow = 'implicit';
								break;
							case 'client_credentials':
								oauth.flow = 'application';
								break;
							case 'password':
								oauth.flow = 'password';
								break;
						}
						if (scheme.description) {
							oauth.description = scheme.description;
						}
						slSecurityScheme['oauth2'].push(oauth);
						break;
					}
					case 'Basic Authentication':
						if (!slSecurityScheme['basic']) {
							slSecurityScheme['basic'] = [];
						}
						slSecurityScheme['basic'].push({
							name: name,
							value: '',
							description: scheme.description || ''
						});
						break;
					default:
					//TODO not supported
				}
			}
		}
		return slSecurityScheme;
	}
	
	_mapRequestBody(methodBody) {
		return this.mapRequestBody(methodBody);
	}
	
	static _mapQueryParameters(queryParameters) {
		let queryString = {type: 'object', properties: {}, required: []};
		for (let key in queryParameters) {
			if (!queryParameters.hasOwnProperty(key)) continue;
			let qp = queryParameters[key];
			queryString.properties[key] = ramlHelper.setParameterFields(qp, {});
			RAML._convertRequiredToArray(qp, key, queryString.required);
		}
		return queryString;
	}
	
	_mapQueryString(queryString) {
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
			RAML._convertRequiredToArray(param, paramId, queryString.required);
		}
		
		return result;
	}
	
	_mapRequestHeaders(data) {
		return RAML._mapQueryParameters(data);
	}
	
	_mapURIParams(uriParams) {
		let pathParams = {type: 'object', properties: {}, required: []};
		
		for (let i in uriParams) {
			if (!uriParams.hasOwnProperty(i)) continue;
			let key = uriParams[i];
			
			pathParams.properties[key.name] = {
				description: key.displayName || key.description || '',
				type: key.type || 'string'
			};
			RAML._convertRequiredToArray(key, key.name, pathParams.required);
			RAML._addAnnotations(key, pathParams.properties[key.name]);
		}
		return pathParams;
	}
	
	static _convertRequiredToArray(object, key, required) {
		if (!object.hasOwnProperty('required') || object.required === true) {
			required.push(key);
		}
		delete object.required;
	}
	
	_mapResponseBody(responses) {
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
	}
	
	_mapSchema(schemData) {
		return this.mapSchema(schemData);
	}
	
	static isValidRefValues(values) {
		if (!_.isArray(values)) {
			return RAML.isValidRefValue(values);
		}
		let result = true;
		for (let index = 0; index < values.length && result == true; index++) {
			result = RAML.isValidRefValue(values[index]);
		}
		
		return result;
	}
	
	static isValidRefValue(value) {
		return typeof value === 'string' && ramlHelper.getScalarTypes.indexOf(value) < 0 && value !== 'object';
	}
	
	// from type=type1 & schema=type1 to ref=type1
	convertRefToModel(object) {
		if (object === 'object') {
			return object;
		}
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
			
			if (isType && RAML.isValidRefValues(val)) {
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
					if (id == 'xml' || id === 'example') { //no process xml object
						object[id] = val;
					} else {
						object[id] = this.convertRefToModel(val);
					}
				}
			}
			else if (id == 'name') { //delete garbage
				delete object[id];
			}
		}
		
		return object;
	}
	
	static mapMimeTypes(body, skip) {
		let result = [];
		let skipMimeTypes = [];
		for (let i in skip) {
			if (!skip.hasOwnProperty(i)) continue;
			
			if (skip[i].value) {
				skipMimeTypes.push(skip[i].value);
			}
		}
		
		for (let i in body) {
			if (!body.hasOwnProperty(i)) continue;
			
			let b = body[i];
			if (b.name) {
				let mimeType = b.name;
				if (skipMimeTypes.indexOf(mimeType) === -1) {
					result.push(mimeType);
				}
			}
		}
		return _.uniq(result);
	}
	
	_mapEndpoint(resource, baseURI, pathParams) {
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
				let c = RAML.mapMimeTypes(method.body, this.data.mediaType);
				endpoint.Consumes = c.length > 0 ? c : null;
				endpoint.Body = this._mapRequestBody(method.body);
			}
			
			if (method.queryParameters) {
				endpoint.QueryString = RAML._mapQueryParameters(method.queryParameters);
			} else if (method.queryString) {
				endpoint.QueryString = this._mapQueryString(method.queryString);
			}
			
			if (method.headers) {
				endpoint.Headers = this._mapRequestHeaders(method.headers);
			}
			
			if (method.responses) {
				let produces = [];
				for (let code in method.responses) {
					if (!method.responses.hasOwnProperty(code)) continue;
					
					if (!method.responses[code] || !method.responses[code].body) {
						continue;
					}
					produces = produces.concat(RAML.mapMimeTypes(method.responses[code].body, this.data.mediaType));
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
				endpoint.securedBy = [];
				for (let si in securedBy) {
					if (!securedBy.hasOwnProperty(si)) continue;
					
					if (typeof securedBy[si] === 'string') {
						endpoint.securedBy.push(securedBy[si]);
					}
					else {
						for (let index in securedBy[si]) {
							if (!securedBy[si].hasOwnProperty(index)) continue;
							let current = securedBy[si][index];
							if (current.scopes) {
								let elem = {};
								elem[index] = current.scopes;
								endpoint.securedBy.push(elem);
							} else {
								endpoint.securedBy.push(index);
							}
						}
					}
				}
			}
			
			//add annotations
			RAML._addAnnotations(method, endpoint);
			
			//TODO endpoint security
			
			this.project.addEndpoint(endpoint);
		}
		
		let resources = resource.resources;
		if (resources && resources.length > 0) {
			for (let j = 0; j < resources.length; j++) {
				this._mapEndpoint(resources[j], baseURI + resource.relativeUri, pathParams);
			}
		}
	}
	
	loadFile(filePath, options) {
		let me = this;
		let parseOptions = {
			attributeDefaults: false
		};
		if (options && options.hasOwnProperty('validate') && options.validate === true) {
			parseOptions.rejectOnErrors = true;
		}
		let mergedOptions = _.merge(parseOptions, options || {});
		
		return new Promise(function (resolve, reject) {
			parser.loadApi(filePath, mergedOptions).then((api) => {
				try {
					me.data = api.expand(true).toJSON(toJSONOptions);
					resolve();
				}
				catch (e) {
					reject(e);
				}
			}).catch((err) => {
				reject(err);
			});
		});
	}
	
	loadData(data, options) {
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
	}
	
	_mapHost() {
		let parsedURL = url.parse(this.data.baseUri || '');
		this.project.Environment.Host = (parsedURL.protocol && parsedURL.host) ? (parsedURL.protocol + '//' + parsedURL.host) : null;
		this.project.Environment.BasePath = parsedURL.path;
	}
	
	_mapTraits(traitGroups) {
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
					slTrait.request.queryString = RAML._mapQueryParameters(trait.queryParameters);
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
	}
	
	static _addAnnotations(source, target) {
		if (!source.annotations) return;
		
		let annotations = source.annotations;
		for (let i in annotations) {
			if (!annotations.hasOwnProperty(i)) continue;
			let value = annotations[i];
			let key = 'x-annotation-' + i;
			target[key] = value.structuredValue;
		}
		
		if (target.annotations) delete target.annotations;
	}
	
	_import() {
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
			
			this.project.Environment.SecuritySchemes = RAML._mapSecuritySchemes(this.data.securitySchemes);
			
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
	}
	
	//noinspection JSMethodCanBeStatic
	description() {
		throw new Error('description method not implemented');
	}
	
	//noinspection JSMethodCanBeStatic
	mapRequestBody() {
		throw new Error('mapRequestBody method not implemented');
	}
	
	//noinspection JSMethodCanBeStatic
	mapSchema() {
		throw new Error('mapSchema method not implemented');
	}
	
	//noinspection JSMethodCanBeStatic
	getSchema() {
		throw new Error('getSchema method not implemented');
	}
}

module.exports = RAML;
