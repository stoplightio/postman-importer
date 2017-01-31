const parser = require('raml-1-parser'),
	Endpoint = require('../entities/endpoint'),
	Importer = require('./importer'),
	Project = require('../entities/project'),
	jsonHelper = require('../utils/json'),
	xmlHelper = require('../utils/xml'),
	ramlHelper = require('../helpers/raml'),
	url = require('url'),
	_ = require('lodash');

const toJSONOptions = {
	serializeMetadata: false
};

//TODO multi file support isn't justified
class RAMLImporter extends Importer {
	constructor() {
		super();
		this.schemas = [];
	}
	
	_getSecuritySchemeSettingsByName(schemeName) {
		const securitySchemes = this.data.securitySchemes;
		for (const i in securitySchemes) {
			if (!securitySchemes.hasOwnProperty(i)) continue;
			
			const entries = _.entries(securitySchemes[i]);
			for (let index = 0; index < entries.length; index++) {
				const entry = entries[index];
				const key = entry[0];
				const value = entry[1];
				
				if (schemeName === key) {
					return value;
				}
			}
		}
	}
	
	static _mapSecuritySchemes(securitySchemes) {
		const slSecurityScheme = {};
		for (const i in securitySchemes) {
			if (!securitySchemes.hasOwnProperty(i)) continue;
			const securityScheme = securitySchemes[i];
			for (const name in securityScheme) {
				if (!securityScheme.hasOwnProperty(name)) continue;
				const scheme = securityScheme[name];
				switch (scheme.type) {
					case 'Pass Through' : {
						if (!slSecurityScheme['apiKey']) {
							slSecurityScheme['apiKey'] = [];
						}
						const apiKey = {
							name: name
						};
						if (scheme.describedBy) {
							if (scheme.describedBy.headers) {
								for (const index in scheme.describedBy.headers) {
									if (!scheme.describedBy.headers.hasOwnProperty(index)) continue;
									const current = scheme.describedBy.headers[index];
									apiKey.headers = [];
									apiKey.headers.push({
										name: current.name
									});
								}
							}
							if (scheme.describedBy.queryParameters) {
								for (const index in scheme.describedBy.queryParameters) {
									if (!scheme.describedBy.queryParameters.hasOwnProperty(index)) continue;
									const current = scheme.describedBy.queryParameters[index];
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
						const oauth = {
							name: name, //not used in stoplight designer
							authorizationUrl: scheme.settings.authorizationUri || '',
							tokenUrl: scheme.settings.accessTokenUri || '',
							scopes: []
						};
						if (Array.isArray(scheme.settings.scopes)) {
							for (const scopeIndex in scheme.settings.scopes) {
								if (!scheme.settings.scopes.hasOwnProperty(scopeIndex)) continue;
								oauth.scopes.push({
									name: scheme.settings.scopes[scopeIndex],
									value: ''
								});
							}
						}
						//authorizationGrants are flow, only one supported in stoplight
						const flow = !_.isEmpty(scheme.settings.authorizationGrants) ? scheme.settings.authorizationGrants[0] : 'code';
						
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
	
	_mapRequestBody(methodBody, checkEmptyType) {
		return this.mapRequestBody(methodBody, checkEmptyType);
	}
	
	static _mapHeadersParameters(queryParameters, traits) {
		return RAMLImporter._mapParameters(queryParameters, traits, 'headers');
	}
	
	static _mapQueryParameters(queryParameters, traits) {
		return RAMLImporter._mapParameters(queryParameters, traits, 'queryParameters');
	}
	
	static _mapParameters(queryParameters, traits, parameterName) {
		//avoid queryParameters from expand option.
		if (traits) {
			RAMLImporter._filterPropertiesFromTraits(queryParameters, traits, parameterName);
		}
		
		const queryString = {type: 'object', properties: {}, required: []};
		for (const key in queryParameters) {
			if (!queryParameters.hasOwnProperty(key)) continue;
			const qp = queryParameters[key];
			const parameterFields = ramlHelper.setParameterFields(qp, {});
			queryString.properties[key] = RAMLImporter.convertResourceRefToModel(parameterFields);
			RAMLImporter._convertRequiredToArray(qp, key, queryString.required);
		}
		return queryString;
	}
	
	static _filterPropertiesFromTraits(params, traits, propertyName) {
		
		for (const i in traits) {
			if (!traits.hasOwnProperty(i)) continue;
			
			for (const j in traits[i]) {
				if (!traits[i].hasOwnProperty(j)) continue;
				const param = traits[i][j];
				if (param.hasOwnProperty(propertyName)) {
					
					for (const k in param[propertyName]) {
						if (!param[propertyName].hasOwnProperty(k)) continue;
						const p = param[propertyName][k];
						const found = _.find(params, {name: p.name});
						if (found) {
							delete params[k];
						}
					}
				}
			}
		}
	}
	
	_mapQueryString(queryString) {
		const result = queryString;
    delete result.typePropertyKind;

    let queryType;

    if (queryString.type){
			queryType = _.isArray(queryString.type) && queryString.type.length == 1 ? queryString.type[0] : queryString.type;
			queryString.type = queryType;
    }

		if (queryType && ramlHelper.getScalarTypes.indexOf(queryType) < 0) {
			result['x-raml-type'] = queryType;
			queryString.type = 'string';
		}
		
		if (queryString.properties) {
			queryString.required = [];
		}
		for (const paramId in queryString.properties) {
			if (!queryString.properties.hasOwnProperty(paramId)) continue;
			const param = queryString.properties[paramId];
			RAMLImporter._convertRequiredToArray(param, paramId, queryString.required);
		}
		
		return result;
	}
	
	_mapRequestHeaders(data, traits) {
		return RAMLImporter._mapHeadersParameters(data, traits);
	}
	
	_mapURIParams(uriParams) {
		const pathParams = {type: 'object', properties: {}, required: []};
		
		for (const i in uriParams) {
			if (!uriParams.hasOwnProperty(i)) continue;
			const key = uriParams[i];
			
			pathParams.properties[key.name] = {
				type: key.type || 'string'
			};
			const description = key.displayName || key.description;
			if (description) {
				pathParams.properties[key.name]['description'] = description;
			}
			RAMLImporter._convertRequiredToArray(key, key.name, pathParams.required);
			RAMLImporter._addAnnotations(key, pathParams.properties[key.name]);
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
		const data = [];
		for (const code in responses) {
			if (!responses.hasOwnProperty(code)) continue;
			const response = responses[code];
			const result = this._mapRequestBody(response.body, false);
			result.codes = [response.code];
			if (result.body) {
				result.body = jsonHelper.cleanSchema(result.body);
			}
			
			if (response.headers) {
				const r = {};
				for (const index in response.headers) {
					if (!response.headers.hasOwnProperty(index)) continue;
					const header = response.headers[index];
					if (!header.hasOwnProperty('type'))
						header['type'] = 'string';
					r[header.name] = this._mapQueryString(header);
					delete r[header.name]['name'];
				}
				result.headers = r;
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
	
	_mapSchemas(schemData) {
		//check if type attribute is abscent and fill with default value (type: string).
		RAMLImporter._checkForDefaultType(schemData);
		return this.mapSchemas(schemData);
	}
	
	static _checkForDefaultType(schemas) {
		for (const index in schemas) {
			if (!schemas.hasOwnProperty(index)) continue;
			
			for (const id in schemas[index]) {
				if (!schemas[index].hasOwnProperty(id)) continue;
				const schema = schemas[index][id];
				RAMLImporter._fillDefaultType(schema);
			}
		}
	}
	
	static _fillDefaultType(object) {
		if (object.properties) {
			for (const id in object.properties) {
				if (!object.properties.hasOwnProperty(id)) continue;
				const current = object.properties[id];
				RAMLImporter._fillDefaultType(current);
			}
		} else {
			if (typeof object === 'object' && !object.hasOwnProperty('type') && !object.hasOwnProperty('schema')) {
				object['type'] = ['string'];
			}
		}
	}
	
	static isValidRefValues(values) {
		if (!_.isArray(values)) {
			return RAMLImporter.isValidRefValue(values);
		}
		let result = true;
		for (let index = 0; index < values.length && result == true; index++) {
			result = RAMLImporter.isValidRefValue(values[index]);
		}
		
		return result;
	}
	
	static isValidRefValue(value) {
		return typeof value === 'string' && ramlHelper.getScalarTypes.indexOf(value) < 0 && value !== 'object';
	}
	
	// from type=type1 & schema=type1 to ref=type1
	static convertRefToModel(object, isResource) {
		if (jsonHelper.isJson(object)) {
			return object;
		}
		// if the object is a string, that means it's a direct ref/type
		if (typeof object === 'string') {
			if (RAMLImporter.isValidRefValue(object)) {
				return {
					$ref: '#/definitions/' + object
				};
			} else {
				return object;
			}
		}
		
		delete object.typePropertyKind;
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;

			const isType = id == 'type';
			if (isType && _.isArray(object[id]) && object[id].length == 1) {
				object[id] = object[id][0];
			}
      let val = object[id];
			if (!val) continue;
			
			if (isType) {
				if (val !== 'object' && typeof val === 'string') {
					object[id] = RAMLImporter._modifyUnionType(val);
					val = object[id];
				}
				if (jsonHelper.isJson(val)) {
					object = val;
					delete object[id];
				} else if (xmlHelper.isXml(val)) {
					object.type = 'object';
				} else if (RAMLImporter.isValidRefValues(val)) {
					object.ref = val;
					delete object[id];
				}
			}
			if (isType && typeof val === 'string') {
				if (val == 'date-only') {
					object.type = 'string';
					object.format = 'date';
				}
				else if (val == 'time-only') {
					object.type = 'string';
					object['x-raml-format'] = 'time-only';
				}
				else if (val == 'datetime-only') {
					object.type = 'string';
					object['x-raml-format'] = 'datetime-only';
				}
				else if (val == 'datetime') {
					object.type = 'string';
					if (object.format == 'rfc3339') {
						object.format = 'date-time';
					} else {
						object['x-raml-format'] = object.format;
						delete object.format;
					}
				}
				else if (val === 'file') {
					object.type = 'string';
					object['x-raml-type'] = 'file';
					if (object.hasOwnProperty('fileTypes')) {
						object['x-raml-fileTypes'] = object['fileTypes'];
						delete object['fileTypes'];
					}
				}
			}
			else if (typeof val === 'object') {
				if (id == 'examples' && !_.isEmpty(val)) {
					for (let id in val) {
						if (!val.hasOwnProperty(id)) continue;
						let example = val[id];
						if (example.hasOwnProperty('name')) {
							example['x-raml-example-name'] = example.name;
							delete example.name;
						}
					}
				} else if (id == 'structuredExample' || id == 'fixedFacets') { //delete garbage
					delete object[id];
				}
				else if (id === 'items' && !val.type && val.hasOwnProperty('0')) {
					object.items = {
						ref: val[0]
					};
				}
				else {
					if (id == 'xml' || id === 'example') { //no process xml object
						object[id] = val;
					} else {
						object[id] = isResource ? RAMLImporter.convertResourceRefToModel(val) : RAMLImporter.convertSchemaRefToModel(val);
					}
				}
			}
			else if (id == 'name') { //delete garbage
				delete object[id];
			}
		}
		
		return object;
	}
	
	// any custom convertion for resources
	static convertResourceRefToModel(object) {
		if (object.hasOwnProperty('example')) {
			object['x-raml-example'] = object.example;
			delete object.example;
		} else if (object.hasOwnProperty('examples')) {
			object['x-raml-example'] = object.examples;
			delete object.examples;
		}
		return RAMLImporter.convertRefToModel(object, true);
	}
	
	// any custom convertion for schemas
	static convertSchemaRefToModel(object) {
		return RAMLImporter.convertRefToModel(object, false);
	}
	
	static _modifyUnionType(type) {
		if (type.includes('|') || type.includes('?'))
			type = 'object';
		
		return type;
	}
	
	static mapMimeTypes(body, skip) {
		const result = [];
		const skipMimeTypes = [];
		for (const i in skip) {
			if (!skip.hasOwnProperty(i)) continue;
			
			if (skip[i].value) {
				skipMimeTypes.push(skip[i].value);
			}
		}
		
		for (const i in body) {
			if (!body.hasOwnProperty(i)) continue;
			
			const b = body[i];
			if (b.name) {
				const mimeType = b.name;
				if (skipMimeTypes.indexOf(mimeType) === -1) {
					result.push(mimeType);
				}
			}
		}
		return _.uniq(result);
	}
	
	_mapEndpoint(resource, baseURI, pathParams) {
		if (resource.uriParameters) {
			if(_.isEmpty(pathParams))
				pathParams = this._mapURIParams(resource.uriParameters);
			else{
				let newParams = this._mapURIParams(resource.uriParameters);
				_.merge(pathParams.properties,newParams.properties);
				pathParams.required = _.concat(pathParams.required,newParams.required);
			}
		}
		
		const mResource = {
			path: baseURI + resource.relativeUri,
			endpoints: [],
			annotations: {}
		};
		
		if (resource.hasOwnProperty('is')) {
			mResource.is = resource.is;
		}
		
		if (resource.displayName) {
			mResource.displayName = resource.displayName;
		}
		
		if (resource.description) {
			mResource.description = resource.description;
		}
		
		RAMLImporter._addAnnotations(resource, mResource.annotations);
		
		const methods = resource.methods;
		for (const i in methods) {
			if (!methods.hasOwnProperty(i)) continue;
			const method = methods[i];
			
			const summary = method.summary ? method.summary : '';
			const endpoint = new Endpoint(summary);
			endpoint.Method = method.method;
			endpoint.Path = baseURI + resource.relativeUri;
			endpoint.Description = method.description ? jsonHelper.stringify(method.description) : '';
			
			endpoint.SetOperationId(method.displayName, endpoint.Method, endpoint.Path);
			
			if (method.body) {
				const c = RAMLImporter.mapMimeTypes(method.body, this.data.mediaType);
				endpoint.Consumes = c.length > 0 ? c : null;
				endpoint.Body = this._mapRequestBody(method.body, true);
			}
			
			if (method.queryParameters) {
				endpoint.QueryString = RAMLImporter._mapQueryParameters(method.queryParameters, this.data.traits);
			} else if (method.queryString) {
				endpoint.QueryString = this._mapQueryString(method.queryString);
			}
			
			if (method.headers) {
				endpoint.Headers = this._mapRequestHeaders(method.headers, this.data.traits);
			}
			
			if (method.responses) {
				let produces = [];
				for (const code in method.responses) {
					if (!method.responses.hasOwnProperty(code)) continue;
					
					if (!method.responses[code] || !method.responses[code].body) {
						continue;
					}
					produces = produces.concat(RAMLImporter.mapMimeTypes(method.responses[code].body, this.data.mediaType));
				}
				const p = _.uniq(produces);
				endpoint.Produces = p.length > 0 ? p : null;
				endpoint.Responses = this._mapResponseBody(method.responses);
			}
			
			endpoint.traits = [];
			const isMethod = method.is || resource.is;
			if (isMethod) {
				if (isMethod instanceof Array) {
					endpoint.traits = isMethod;
				} else if (isMethod instanceof Object) {
					endpoint.traits = Object.keys(isMethod);
				}
			}
			
			endpoint.PathParams = pathParams;
			
			//endpoint security
			const securedBy = method.securedBy;
			if (Array.isArray(securedBy)) {
				endpoint.securedBy = [];
				for (const si in securedBy) {
					if (!securedBy.hasOwnProperty(si)) continue;
					
					if (typeof securedBy[si] === 'string') {
						endpoint.securedBy.push(securedBy[si]);
					}
					else {
						for (const index in securedBy[si]) {
							if (!securedBy[si].hasOwnProperty(index)) continue;
							const current = securedBy[si][index];
							if (current.scopes) {
								const elem = {};
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
			RAMLImporter._addAnnotations(method, endpoint);
			
			//TODO endpoint security
			mResource.endpoints.push(endpoint);
		}
		this.project.addResource(mResource);
		
		const resources = resource.resources;
		if (resources && resources.length > 0) {
			for (let j = 0; j < resources.length; j++) {
				this._mapEndpoint(resources[j], baseURI + resource.relativeUri, pathParams);
			}
		}
	}
	
	loadFile(filePath, options) {
		return new Promise((resolve, reject) => {
			parser.loadApi(filePath, RAMLImporter._options(options)).then((api) => {
				try {
					this.data = api.expand(false).toJSON(toJSONOptions);
					resolve();
				}
				catch (e) {
					reject(e);
				}
			}).catch(reject);
		});
	}

	loadData(data, options) {
		return new Promise((resolve, reject) => {
			try {
				const parsedData = parser.parseRAMLSync(data, RAMLImporter._options(options));
				if (parsedData.name === 'Error') {
					reject(error);
				} else {
					this.data = parsedData.expand(true).toJSON(toJSONOptions);
					resolve();
				}
			} catch (e) {
				reject(e);
			}
		});
	}

	static _options(options) {
    const validate = options && (options.validate === true || options.validateImport === true);
		const parseOptions = {
			attributeDefaults: false,
			rejectOnErrors: validate
		};
		return !options ? parseOptions : _.merge(parseOptions, options);
	}

	_mapHost() {
		const parsedURL = url.parse(this.data.baseUri || '');
		this.project.Environment.Host = (parsedURL.protocol && parsedURL.host) ? (parsedURL.protocol + '//' + parsedURL.host) : null;
		this.project.Environment.BasePath = parsedURL.path;
	}
	
	_mapTraits(traitGroups) {
		const slTraits = [];
		
		for (const i in traitGroups) {
			if (!traitGroups.hasOwnProperty(i)) continue;
			const traitGroup = traitGroups[i];
			
			for (const k in traitGroup) {
				if (!traitGroup.hasOwnProperty(k)) continue;
				const trait = traitGroup[k];
				const slTrait = {
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
					slTrait.request.queryString = RAMLImporter._mapQueryParameters(trait.queryParameters);
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
		
		const annotations = source.annotations;
		for (const i in annotations) {
			if (!annotations.hasOwnProperty(i)) continue;
			if (_.startsWith(i, 'oas-')) continue;
			const value = annotations[i];
			const key = 'x-raml-annotation-' + i;
			target[key] = value.structuredValue || '';
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
				for (const i in this.project.Environment.Protocols) {
					if (!this.project.Environment.Protocols.hasOwnProperty(i)) continue;
					this.project.Environment.Protocols[i] = this.project.Environment.Protocols[i].toLowerCase();
				}
			}
			
			const mimeTypes = [];
			let mediaType = this.data.mediaType;
			if (mediaType) {
				if (!_.isArray(mediaType)) {
					mediaType = [mediaType];
				}
				for (const i in mediaType) {
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
			
			this.project.Environment.SecuritySchemes = RAMLImporter._mapSecuritySchemes(this.data.securitySchemes);
			
			const resources = this.data.resources;
			if (!_.isEmpty(resources)) {
				for (let i = 0; i < resources.length; i++) {
					this._mapEndpoint(resources[i], '', {});
				}
			}
			
			const schemas = this._mapSchemas(this.getSchemas(this.data));
			for (const s in schemas) {
				if (!schemas.hasOwnProperty(s)) continue;
				this.project.addSchema(schemas[s]);
			}
			
			this.project.traits = this._mapTraits(this.data.traits);
			this.project.uses = this.data.uses;
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
	mapSchemas() {
		throw new Error('mapSchema method not implemented');
	}
	
	//noinspection JSMethodCanBeStatic
	getSchemas() {
		throw new Error('getSchema method not implemented');
	}
}

module.exports = RAMLImporter;
