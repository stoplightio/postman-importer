const parser = require('swagger-parser');
const Method = require('../entities/swagger/method');
const Endpoint = require('../entities/endpoint');
const Schema = require('../entities/schema');
const Importer = require('./importer');
const Project = require('../entities/project');
const jsonHelper = require('../utils/json');
const swaggerHelper = require('../helpers/swagger');
const YAML = require('js-yaml');
const _ = require('lodash');

const referenceRegex = /\/(parameters|responses)\/(.+)/i;

class Swagger extends Importer {
	constructor() {
		super();
		this.dereferencedAPI = null;
	}
	
	static needDeReferenced(param) {
		if (!param || !param.$ref) {
			return false;
		}
		
		return param.$ref.match(referenceRegex);
	}
	
	static mapExample(data, target) {
		if (data.example) {
			target.example = jsonHelper.stringify(data.example, 4);
			delete data.example;
		}
	}
	
	static _mapSecurityDefinitions(securityDefinitions, dereferenceSecurityDefinitions) {
		if (securityDefinitions.hasOwnProperty('$ref')) {
			securityDefinitions = dereferenceSecurityDefinitions;
		}
		
		const result = {};
		for (const name in securityDefinitions) {
			if (!securityDefinitions.hasOwnProperty(name)) continue;
			const type = securityDefinitions[name].type;
			const sd = securityDefinitions[name];
			switch (type) {
			case 'apiKey': {
				if (!result.hasOwnProperty(type)) {
					result[type] = {};
				}
					
				const current = {
					externalName: name,
					name: sd.name,
					value: '',
					description: sd.description
				};

				const keyPlaceHolder = (sd.in === 'header') ? 'headers' : 'queryString';
				if (!result[type].hasOwnProperty(keyPlaceHolder)) {
					result[type][keyPlaceHolder] = [];
				}
				result[type][keyPlaceHolder].push(current);
				break;
			}
			case 'oauth2': {
				if (!result.hasOwnProperty(type)) {
					result[type] = [];
				}
				const current = {
					name: name,
					authorizationUrl: sd.authorizationUrl || '',
						//scopes: slScopes,
					tokenUrl: sd.tokenUrl || ''
				};
					
				const slScopes = [];
				const swaggerScopes = sd.scopes;
					
				if (swaggerScopes) {
					for (const key in swaggerScopes) {
						if (!swaggerScopes.hasOwnProperty(key)) continue;
						const scope = {};
						scope['name'] = key;
						scope['value'] = swaggerScopes[key];
						slScopes.push(scope);
					}
				}
					
				if (sd.flow) {
					current['flow'] = sd.flow;
				}
					
				if (sd.description) {
					current['description'] = sd.description;
				}
					
				if (!_.isEmpty(slScopes)) {
					current['scopes'] = slScopes;
				}
					
				result[type].push(current);
				break;
			}
			case 'basic': {
				if (!result.hasOwnProperty(type)) {
					result[type] = [];
				}
					
				const current = {
					name: name,
					value: '',
					description: sd.description || ''
				};
				result[type].push(current);
				break;
			}
			}
		}
		return result;
	}
	
	_mapSchema(schemaDefinitions) {
		const result = [];
		for (const schemaName in schemaDefinitions) {
			if (!schemaDefinitions.hasOwnProperty(schemaName)) continue;
			const sd = new Schema(schemaName);
			sd.Name = schemaName;
			//create a clone to remove extension properties
			const schemaDataClone = _.clone(schemaDefinitions[schemaName]);
			const re = /^x-/; //properties to avoid
			for (const prop in schemaDataClone) {
				if (schemaDataClone.hasOwnProperty(prop) && prop.match(re)) {
					delete schemaDataClone[prop];
				}
			}
			
			Swagger.mapExample(schemaDataClone, sd);
			sd.Definition = schemaDataClone;
			result.push(sd);
		}
		return result;
	}
	
	_mapQueryString(params, skipParameterRefs) {
		const queryString = {type: 'object', properties: {}, required: []};
		for (const i in params) {
			if (!params.hasOwnProperty(i)) continue;
			const param = params[i];
			
			if (skipParameterRefs && Swagger.needDeReferenced(param)) {
				continue;
			}
			
			if (param.in && param.in !== 'query') {
				//skip other type of params
				continue;
			}
			queryString.properties[param.name] = swaggerHelper.setParameterFields(param, {});
			if (param.required) {
				queryString.required.push(param.name);
			}
		}
		return queryString;
	}
	
	_mapURIParams(params, resolvedParameters) {
		const pathParams = {type: 'object', properties: {}, required: []};
		for (const i in params) {
			if (!params.hasOwnProperty(i)) continue;
			let param = params[i];
			if ((Swagger.needDeReferenced(param) || param.hasOwnProperty('$ref')) && resolvedParameters) {
				param = resolvedParameters[i];
			}
			
			if (param.in && param.in !== 'path') {
				//skip other type of params
				continue;
			}
			pathParams.properties[param.name] = swaggerHelper.setParameterFields(param, {});
			pathParams.required.push(param.name);
		}
		
		return pathParams;
	}
	
	_mapRequestBody(params, resolvedParams) {
		if (_.isEmpty(params) ||
			!_.some(params, {'in': 'body'}) && !_.some(params, {'in': 'formData'})) {
			return;
		}
		
		const data = {
			body: {properties: {}, required: []},
			example: ''
		};
		
		for (const i in params) {
			if (!params.hasOwnProperty(i)) continue;
			let param = params[i];
			
			if (Swagger.needDeReferenced(param)) {
				param = resolvedParams[i];
			}
			
			if (param.in && param.in !== 'body' && param.in !== 'formData') {
				continue;
			}
			switch (param.in) {
			case 'body':
				Swagger.mapExample(param.schema, data);
				data.body = param.schema;
				if (param.name) {
					data.name = param.name;
				}
				if (param.description) {
					data.description = jsonHelper.stringify(param.description);
				}
				break;
			default: {
				let prop = {};
				prop = swaggerHelper.setParameterFields(param, prop);
				if (param.required) {
					data.body.required.push(param.name);
				}
				data.body.properties[param.name] = prop;
			}
			}
		}
		//remove required field if doesn't have anything inside it
		if (data.body.required && data.body.required.length === 0) {
			delete data.body.required;
		}
		return data;
	}
	
	_mapResponseBody(responses, skipParameterRefs, resolvedResponses, $refs) {
		const data = [];
		for (const code in responses) {
			if (!responses.hasOwnProperty(code)) continue;
			const res = {body: {}, example: '', codes: []};
			let description = '';
			
			const response = responses[code];
			
			if (skipParameterRefs && Swagger.needDeReferenced(response) &&
				(response.$ref.match(/trait/) || _.includes($refs, response.$ref))) {
				continue;
			}
			
			const needBeReferenced = Swagger.needDeReferenced(response);
			if (needBeReferenced && resolvedResponses) {
				const resolvedResponse = this._getResponses(response, resolvedResponses[code]);
				let schema = resolvedResponse.schema;
				description = jsonHelper.stringify(resolvedResponse.description || '');
				res.body = schema;
			} else if (response.schema) {
				let schema = response.schema;
				if (Swagger.needDeReferenced(response.schema)) {
					description = jsonHelper.stringify(resolvedResponses[code].description || '');
					schema = resolvedResponses[code].schema;
				}
				res.body = schema;
			}
			
			Swagger._mapResponseExample(needBeReferenced ? resolvedResponses[code] : response, res);
			Swagger._mapResponseHeaders(needBeReferenced ? resolvedResponses[code] : response, res);
			Swagger._mapResponseDescription(needBeReferenced ? resolvedResponses[code] : response, description, res);
			if (needBeReferenced) {
				res.response_id = needBeReferenced[needBeReferenced.length -1];
			}
			
			res.codes.push(String(code));
			
			data.push(res);
		}
		
		const extensions = Swagger._getExtensionsFrom(responses);
		if (!_.isEmpty(extensions)) {
			data.extensions = extensions;
		}
		
		return data;
	}
	
	static _mapResponseDescription(responseBody, description, res) {
		res.description = jsonHelper.stringify(description || responseBody.description || '');
	}
	
	static _mapResponseHeaders(responseBody, res) {
		if (responseBody.hasOwnProperty('headers') && !_.isEmpty(responseBody.headers)) {
			res.headers = {
				properties: responseBody.headers
			};
		}
	}
	
	static _mapResponseExample(responseBody, res) {
		if (responseBody.hasOwnProperty('examples') && !_.isEmpty(responseBody.examples)) {
			const examples = responseBody.examples;
			
			if (_.isArray(examples)) {
				for (const t in examples) {
					if (!examples.hasOwnProperty(t)) continue;
					if (t === res.type /* resType */) { // FIXME
						res.example = jsonHelper.stringify(examples[t], 4);
					}
				}
			} else {
				res.example = jsonHelper.stringify(examples, 4);
			}
		}
	}
	
	_mapRequestHeaders(params, skipParameterRefs) {
		const data = {type: 'object', properties: {}, required: []};
		for (const i in params) {
			if (!params.hasOwnProperty(i)) continue;
			const param = params[i];
			
			if (skipParameterRefs && Swagger.needDeReferenced(param)) {
				continue;
			}
			
			if (param.in !== 'header') {
				//skip other type of params
				continue;
			}
			
			data.properties[param.name] = swaggerHelper.setParameterFields(param, {});
			if (param.required) {
				data.required.push(param.name);
			}
		}
		return data;
	}
	
	_parseData(dataOrPath, options) {
		return new Promise((resolve, reject) => {
			
			const validateOptions = _.cloneDeep(options || {});
			const validate = options && (options.validate === true || options.validateImport === true);
			validateOptions.validate = { schema: validate, spec: validate};
			
			// with validation
			//in case of data, if not cloned, referenced to resolved data
			const dataCopy = _.cloneDeep(dataOrPath);
			parser.validate(dataCopy, validateOptions)
				.then(() => {
					this._doParseData(dataOrPath, options || {}, resolve, reject);
				})
				.catch(reject);
		});
	}
	
	_doParseData(dataOrPath, options, resolve, reject) {
		// without validation
		parser.parse(dataOrPath, options)
			.then((api) => {
				JSON.parse(JSON.stringify(api));
				
				this.data = api;
				let parseFn;
				if (typeof dataOrPath === 'string') {
					parseFn = parser.dereference(dataOrPath, JSON.parse(JSON.stringify(api)), options);
				} else {
					parseFn = parser.dereference(JSON.parse(JSON.stringify(api)), options);
				}
				
				parseFn
					.then((dereferencedAPI) => {
						if (options && options.expand) {
							this.data = dereferencedAPI;
						} else {
							this.dereferencedAPI = dereferencedAPI;
						}
						resolve();
					})
					.catch(reject);
			})
			.catch(reject);
	}

// Load a swagger spec by local or remote file path
	loadFile(path, options) {
		return this._parseData(path, options);
	}

// Load a swagger spec by string data
	loadData(data, options) {

		return new Promise((resolve, reject) => {
			let parsedData;
			try {
				parsedData = JSON.parse(data);
			} catch (err) {
				// Possibly YAML Data
				try {
					parsedData = YAML.safeLoad(data, {json: true});
				} catch (err) {
					return reject(err);
				}
			}
			
			this._parseData(parsedData, options).then(resolve).catch(reject);
		});
	}

//for now, if 'application/json' exist in supported type, use that
	static findDefaultMimeType(mimeTypes) {
		if (!mimeTypes || mimeTypes.length <= 0) {
			return null;
		}
		
		for (const i in mimeTypes) {
			if (!mimeTypes.hasOwnProperty(i)) continue;
			if (mimeTypes[i] === 'application/json') {
				return mimeTypes[i];
			}
		}
		
		return mimeTypes[0];
	}
	
	static _mapEndpointTrait(params, resolvedParameters) {
		const traits = [];
		for (const i in params) {
			if (!params.hasOwnProperty(i)) continue;
			const param = params[i];
			
			if (!Swagger.needDeReferenced(param) || Swagger._isFilePath(param)) {
				continue;
			}
			
			const parts = param.$ref.split('/');
			const traitParts = parts[parts.length - 1].split(':');
			let name = traitParts[0];
			if (traitParts[0] === 'trait') {
				name = traitParts[1];
			}
			
			if (resolvedParameters && resolvedParameters[name] && resolvedParameters[name].in && resolvedParameters[name].in === 'path') {
				continue;
			}
			traits.push(name);
		}
		
		return traits;
	}
	
	static _mapEndpointTraits(params) {
		let traits = [];
		
		traits = traits.concat(Swagger._mapEndpointTrait(params));
		// traits = traits.concat(this._mapEndpointTrait(responses));
		
		return _.uniq(traits);
	}
	
	static _getParams(params, resolvedParameters, condition) {
		if (_.isEmpty(params)) return params;
		
		const result = [];
		for (const id in params) {
			if (!params.hasOwnProperty(id)) continue;
			let param = params[id];
			if (condition && !condition(param)) {
				continue;
			}
			const deReferenced = Swagger.needDeReferenced(param);
			const isFilePath = Swagger._isFilePath(param);
			if ((deReferenced && !isFilePath) && deReferenced.length) continue;
			
			if (isFilePath && resolvedParameters) {
				param = resolvedParameters[id];
			}
			result.push(param);
		}
		
		return result;
	}
	
	_getResponses(response, resolvedResponse) {
		let result;
		const deReferenced = Swagger.needDeReferenced(response);
		const isFilePath = Swagger._isFilePath(response);
		if ((deReferenced || isFilePath) && resolvedResponse) {
			if (isFilePath) {
				result = resolvedResponse;
			} else {
				const responseName = deReferenced[deReferenced.length - 1];
				result = this.data.responses[responseName];
				if (result.$ref) {
					result = resolvedResponse;
				}
			}
		}
		
		return result;
	}
	
	static _isFilePath(param) {
		if (!param || !param.$ref) {
			return false;
		}
		
		const filePath = param.$ref.split('#')[0];
		return filePath.split('.').length > 1;
	}
	
	_mapEndpoints(project, consumes, produces) {
		for (const path in this.data.paths) {
			if (!this.data.paths.hasOwnProperty(path)) continue;
			if (_.startsWith(path, 'x-')) continue; //avoid custom extensions
			
			const methods = this.data.paths[path].hasOwnProperty('$ref') ? this.dereferencedAPI.paths[path] : this.data.paths[path];
			let resolvedPathParames = {};
			let globalParamsURI = {};
			let pathParamRef = [];
			let globalParamsNonURI = [];
			if (methods.parameters) {
				resolvedPathParames = this.dereferencedAPI ? this.dereferencedAPI.paths[path].parameters : methods.parameters;
				globalParamsURI = this._mapURIParams(methods.parameters, resolvedPathParames);
				
				pathParamRef = Swagger._mapEndpointTrait(methods.parameters, this.dereferencedAPI.parameters);
				if (!_.isEmpty(pathParamRef)) {
					project.addPathParamRef(path, pathParamRef);
				}
				
				globalParamsNonURI = Swagger._getParams(methods.parameters, resolvedPathParames, (param) => {
					return !(param.in && param.in === 'path');
				});
			}
			
			for (const method in methods) {
				if (!methods.hasOwnProperty(method)) continue;
				if (method === 'parameters') continue;
				
				const currentMethod = new Method(methods[method], this.dereferencedAPI ? this.dereferencedAPI.paths[path][method] : methods[method]);
				const currentMethodResolved = this.dereferencedAPI ? this.dereferencedAPI.paths[path][method] : methods[method];
				const endpoint = new Endpoint(currentMethod.summary || '');
				
				const extensions = Swagger._getExtensionsFrom(currentMethodResolved);
				if (!_.isEmpty(extensions)) {
					endpoint.extensions = extensions;
				}
				
				endpoint.Method = method;
				endpoint.Path = path;
				
				endpoint.Tags = currentMethod.tags || [];
				endpoint.Summary = (currentMethod.summary || '').substring(0, 139);
				endpoint.Description = jsonHelper.stringify(currentMethod.description);
				endpoint.Deprecated = currentMethod.deprecated;
				endpoint.SetOperationId(currentMethod.operationId, method, path);
				endpoint.ExternalDocs = currentMethod.externalDocs;
				if (currentMethod.schemes) {
					endpoint.protocols = currentMethod.schemes;
				}
				
				//map request body
				// if (_.isArray(currentMethod.consumes)) {
				//   if (_.isEmpty(currentMethod.consumes)) {
				//     reqType = null;
				//   } else {
				//     reqType = this.findDefaultMimeType(currentMethod.consumes);
				//   }
				// }
				
				const params = _.union(globalParamsNonURI, Swagger._getParams(currentMethod.parameters, currentMethodResolved.parameters));
				let c = [];
				if (_.some(params, {'in': 'body'})) {
					c.push('application/json');
				}
				
				if (_.some(params, {'in': 'formData'})) {
					c.push('multipart/form-data');
				}
				
				if (consumes && _.isArray(consumes) && c.length) {
					consumes.forEach(mimeType => c = _.without(c, mimeType));
				}
				
				if (c.length) {
					endpoint.Consumes = c;
				}
				
				if (currentMethod.consumes && _.isArray(currentMethod.consumes)) {
					c = _.uniq((endpoint.Consumes && _.isArray(endpoint.Consumes)) ? endpoint.Consumes.concat(currentMethod.consumes) : currentMethod.consumes);
					if (consumes && _.isArray(consumes) && c.length) {
						consumes.forEach(mimeType => c = _.without(c, mimeType));
					}
					if (endpoint.Consumes || c.length) {
						endpoint.Consumes = c;
					}
				}
				
				if (endpoint.Method.toLowerCase() !== 'get' &&
					endpoint.Method.toLowerCase() !== 'head') {
					const body = this._mapRequestBody(params, currentMethodResolved.parameters);
					
					if (body) {
						endpoint.Body = body;
					}
				}
				
				// this needs to happen before the mappings below, because param/response $refs will be removed after those mappings
				endpoint.traits = Swagger._mapEndpointTraits(currentMethod.parameters, currentMethod.responses);
				
				//if path params are defined in this level
				//map path params
				const mapURIParams = this._mapURIParams(currentMethod.parameters, currentMethodResolved.parameters);
				const pathParams = {};
				_.merge(pathParams, globalParamsURI);
				_.merge(pathParams, mapURIParams);
				endpoint.PathParams = pathParams;
				
				//map headers
				endpoint.Headers = this._mapRequestHeaders(params, true);
				
				//map query string
				// endpoint.QueryString = this._mapQueryString(currentMethod.parameters, true);
				endpoint.QueryString = this._mapQueryString(params, true);
				
				//map response body
				// if (_.isArray(currentMethod.produces)) {
				//   if (_.isEmpty(currentMethod.produces)) {
				//     resType = null;
				//   } else {
				//     resType = this.findDefaultMimeType(currentMethod.produces);
				//   }
				// }
				if (currentMethod.produces && _.isArray(currentMethod.produces)) {
					let p = _.uniq((endpoint.Produces && _.isArray(endpoint.Produces)) ? endpoint.Produces.concat(currentMethod.produces) : currentMethod.produces);
					if (produces && _.isArray(produces) && p.length) {
						produces.forEach(mimeType => p = _.without(p, mimeType));
					}
					if (endpoint.Produces || p.length) {
						endpoint.Produces = p;
					}
				}
				const responses = this._mapResponseBody(currentMethod.responses, true, currentMethodResolved.responses, this.$refs);
				
				if (responses) {
					endpoint.Responses = responses;
				}
				
				//map security
				if (currentMethod.security) {
					const securities = currentMethod.security;
					for (const securityIndex in securities) {
						if (!securities.hasOwnProperty(securityIndex)) continue;
						const keys = Object.keys(securities[securityIndex]);
						const securityName = keys[0];
						const scheme = _.get(this, ['data', 'securityDefinitions', securityName]);
						if (!scheme) {
							//definition error
							continue;
						}
						switch (scheme.type) {
						case 'apiKey':
						case 'basic':
							if (!endpoint.SecuredBy) {
								endpoint.SecuredBy = {};
							}
							endpoint.SecuredBy[scheme.type] = {
								name: securityName
							};
							break;
						case 'oauth2':
							if (!endpoint.SecuredBy) {
								endpoint.SecuredBy = {};
							}
							endpoint.SecuredBy[scheme.type] = {
								name: securityName,
								scope: securities[securityIndex][securityName]
							};
							break;
						}
					}
				}
				
				project.addEndpoint(endpoint);
			}
		}
	}
	
	_mapTraits(parameters, responses, resolvedParameters) {
		const traits = {};
		const queryParams = {};
		const headerParams = {};
		const formDataParams = {};
		const bodyParams = {};
		const traitResponses = {};
		
		for (const k in parameters) {
			if (!parameters.hasOwnProperty(k)) continue;
			let param = parameters[k];
			const parts = k.split(':');
			let name = k;
			
			if (parts[0] === 'trait') {
				name = parts[1];
			}
			
			if (Swagger._isFilePath(param)) {
				param = resolvedParameters[k];
			}
			
			switch (param.in) {
			case 'query':
				queryParams[name] = queryParams[name] || [];
				queryParams[name].push(param);
				break;
			case 'header':
				headerParams[name] = headerParams[name] || [];
				headerParams[name].push(param);
				break;
			case 'formData':
				formDataParams[name] = formDataParams[name] || [];
				formDataParams[name].push(param);
				break;
			case 'body':
				bodyParams[name] = bodyParams[name] || [];
				bodyParams[name].push(param);
				break;
			}
		}
		
		for (const r in responses) {
			if (!responses.hasOwnProperty(r)) continue;
			
			const response = responses[r];
			let resName = r;
			let resCode = 200;
			const resNameParts = r.split(':');
			
			// Support for StopLight Swagger traits
			if (resNameParts.length === 3 && resNameParts[0] === 'trait') {
				resName = resNameParts[1];
				resCode = resNameParts[2];
			}
			
			traitResponses[resName] = traitResponses[resName] || {};
			traitResponses[resName][resCode] = response;
		}
		
		for (const k in queryParams) {
			if (!queryParams.hasOwnProperty(k)) continue;
			const trait = traits[k] || {
				_id: k,
				name: k,
				request: {},
				responses: []
			};
			
			trait.request.queryString = this._mapQueryString(queryParams[k]);
			traits[k] = trait;
		}
		
		for (const k in headerParams) {
			if (!headerParams.hasOwnProperty(k)) continue;
			const trait = traits[k] || {
				_id: k,
				name: k,
				request: {},
				responses: []
			};
			
			trait.request.headers = this._mapRequestHeaders(headerParams[k]);
			traits[k] = trait;
		}
		
		for (const k in formDataParams) {
			if (!formDataParams.hasOwnProperty(k)) continue;
			const trait = traits[k] || {
				_id: k,
				name: k,
				request: {},
				responses: []
			};
			
			trait.request.formData = this._mapRequestBody(formDataParams[k]);
			traits[k] = trait;
		}
		
		for (const k in bodyParams) {
			if (!bodyParams.hasOwnProperty(k)) continue;
			const trait = traits[k] || {
				_id: k,
				name: k,
				request: {},
				responses: []
			};
			
			trait.request.body = this._mapRequestBody(bodyParams[k]);
			traits[k] = trait;
		}
		
		for (const k in traitResponses) {
			if (!traitResponses.hasOwnProperty(k)) continue;
			const trait = traits[k] || {
				_id: k,
				name: k,
				request: {},
				responses: []
			};
			trait.responses = this._mapResponseBody(traitResponses[k]);
			traits[k] = trait;
		}
		
		return _.values(traits);
	}
	
	static _getExtensionsFrom(object) {
		const result = {};
		for (const key in object) {
			if (!object.hasOwnProperty(key)) continue;
			
			if (_.startsWith(key, 'x-')) result[key] = object[key];
		}
		return result;
	}
	
	_createExtensions(project) {
		project.extensions = Swagger._getExtensionsFrom(this.data);
		
		if (this.data.info) {
			const infoExtensions = Swagger._getExtensionsFrom(this.data.info);
			if (!_.isEmpty(infoExtensions)) {
				project.Environment.extensions = infoExtensions;
			}
		}
		
		if (this.data.info.contact) {
			const contactExtensions = Swagger._getExtensionsFrom(this.data.info.contact);
			if (!_.isEmpty(contactExtensions)) {
				project.Environment.contactInfo.extensions = contactExtensions;
			}
		}
		
		if (this.data.info.license) {
			const licenseExtensions = Swagger._getExtensionsFrom(this.data.info.license);
			if (!_.isEmpty(licenseExtensions)) {
				project.Environment.license.extensions = licenseExtensions;
			}
		}
		
		if (this.data.externalDocs) {
			const externalDocsExtensions = Swagger._getExtensionsFrom(this.data.externalDocs);
			if (!_.isEmpty(externalDocsExtensions)) {
				project.Environment.ExternalDocs.extensions = externalDocsExtensions;
			}
		}
		
		if (this.data.paths) {
			const endpointExtensions = Swagger._getExtensionsFrom(this.data.paths);
			if (!_.isEmpty(endpointExtensions)) {
				project.endpointExtensions = {};
				project.endpointExtensions = endpointExtensions;
			}
		}
	}
	
	_import() {
		const project = new Project(this.data.info.title);
		project.Description = this.data.info.description || '';
		project.tags = this.data.tags;
		
		let protocol = 'http';
		if (this.data.schemes && this.data.schemes.length > 0) {
			project.Environment.Protocols = this.data.schemes;
			protocol = this.data.schemes[0];
		}
		
		this._mapEndpoints(project, this.data.consumes, this.data.produces);
		
		project.Environment.summary = this.data.info.description || '';
		project.Environment.BasePath = this.data.basePath || '';
		project.Environment.Host = this.data.host ? (protocol + '://' + this.data.host) : '';
		project.Environment.Version = this.data.info.version;
		
		if (this.data.externalDocs) {
			project.Environment.ExternalDocs = {
				description: this.data.externalDocs.description,
				url: this.data.externalDocs.url
			};
		}
		
		if (this.data.info.contact) {
			project.Environment.contactInfo = {};
			if (this.data.info.contact.name) {
				project.Environment.contactInfo.name = this.data.info.contact.name;
			}
			if (this.data.info.contact.url) {
				project.Environment.contactInfo.url = this.data.info.contact.url;
			}
			if (this.data.info.contact.email) {
				project.Environment.contactInfo.email = this.data.info.contact.email;
			}
		}
		
		if (this.data.info.termsOfService) {
			project.Environment.termsOfService = this.data.info.termsOfService;
		}
		
		if (this.data.info.license) {
			project.Environment.license = {};
			if (this.data.info.license.name) {
				project.Environment.license.name = this.data.info.license.name;
			}
			if (this.data.info.license.url) {
				project.Environment.license.url = this.data.info.license.url;
			}
			
		}
		
		if (this.data.produces) {
			//taking the first as default one
			project.Environment.Produces = this.data.produces;
		}
		
		if (this.data.consumes) {
			//taking the first as default one
			project.Environment.Consumes = this.data.consumes;
		}
		if (this.data.securityDefinitions) {
			project.Environment.SecuritySchemes = Swagger._mapSecurityDefinitions(this.data.securityDefinitions, this.dereferencedAPI.securityDefinitions);
		}
		
		project.traits = this._mapTraits(this.data.parameters, this.data.responses, this.dereferencedAPI.parameters);
		
		const schemas = this._mapSchema(this.data.definitions);
		for (const i in schemas) {
			if (!schemas.hasOwnProperty(i)) continue;
			project.addSchema(schemas[i]);
		}
		
		this._createExtensions(project);

		return project;
	}
}
module.exports = Swagger;
