const Exporter = require('./exporter'),
	jsonHelper = require('../utils/json.js'),
	stringHelper = require('../utils/strings.js'),
	urlHelper = require('../utils/url'),
	SwaggerDefinition = require('../entities/swagger/definition'),
	swaggerHelper = require('../helpers/swagger'),
	_ = require('lodash'),
	url = require('url');

class Swagger extends Exporter {
	constructor() {
		super();
	}
	
	static mapExample(data, target) {
		if (!_.isEmpty(data.example)) {
			let example = jsonHelper.parse(data.example);
			if (!_.isEmpty(example)) {
				target.example = example;
			}
		}
	}
	
	_getResponseTypes(endpoint, defaultResponseType) {
		let defRespType = defaultResponseType || [],
			produces = endpoint.Produces || [];
		
		return produces.reduce(function (result, mimeType) {
			if (result.indexOf(mimeType) === -1 &&
				defRespType.indexOf(mimeType) === -1) {
				result.push(mimeType);
			}
			
			return result;
		}, []);
	}
	
	_getRequestTypes(endpoint, parameters, defaultRequestType) {
		let result = [],
			typesToInclude = ['multipart/form-data', 'application/x-www-form-urlencoded'],
			consumes = endpoint.Consumes || [],
			defReqType = defaultRequestType || [];
		
		for (let i in parameters) {
			if (!parameters.hasOwnProperty(i)) continue;
			
			if (parameters[i].type && parameters[i].type === 'file') {
				//consumes must have 'multipart/form-data' or 'application/x-www-form-urlencoded'
				typesToInclude.forEach(function (mimeType) {
					if (!result.length) {
						if (consumes.indexOf(mimeType) >= 0) {
							result.push(mimeType);
						} else if (defReqType.indexOf(mimeType) >= 0) {
							result.push(mimeType);
						}
					}
				});
				if (!result.length) {
					//as swagger spec validation must want one of these, add one
					result.push(typesToInclude[0]);
				}
				//no need for the further iterations
				break;
			}
		}
		
		if (!_.isEmpty(consumes)) {
			consumes.forEach(function (mimeType) {
				if (defReqType.indexOf(mimeType) === -1) {
					result.push(mimeType);
				}
			});
		}
		
		return _.uniq(result);
	}
	
	static _validateParameters(parameters) {
		parameters = jsonHelper.orderByKeys(parameters, ['$ref', 'name', 'in', 'description', 'required', 'schema', 'type']);
		let validTypes = ['string', 'number', 'integer', 'boolean', 'array', 'file'], defaultType = 'string';
		for (let i in parameters) {
			if (!parameters.hasOwnProperty(i)) continue;
			
			if (parameters[i].in && parameters[i].in != 'body') {
				if (Array.isArray(parameters[i].type)) {
					if (parameters[i].type.length > 0) {
						parameters[i].type = parameters[i].type[0];
					} else {
						parameters[i].type = defaultType;
					}
				}
				if (validTypes.indexOf(parameters[i].type) < 0) {
					//type not valid
					parameters[i].type = defaultType;
				}
			}
		}
		return parameters;
	}
	
	_constructTags(endpoint, env) {
		let tags = endpoint.tags || [];
		
		let group = _.find(env.GroupsOrder.docs, function (g) {
			return _.find(g.items, ['_id', endpoint._id]);
		});
		
		if (group) {
			tags.push(group.name);
		}
		
		return _.uniq(tags);
	}
	
	_constructSwaggerMethod(endpoint, parameters, responses, env) {
		let consumes = this._getRequestTypes(endpoint, parameters, env.Consumes);
		let produces = this._getResponseTypes(endpoint, env.Produces);
		endpoint.SetOperationId(endpoint.operationId, endpoint.Method, endpoint.Path);
		
		let resultSwaggerMethod = {};
		
		if (!_.isEmpty(endpoint.operationId)) {
			resultSwaggerMethod.operationId = endpoint.operationId;
		}
		
		if (!_.isEmpty(endpoint.Name)) {
			resultSwaggerMethod.summary = endpoint.Name;
		}
		
		let tags = this._constructTags(endpoint, env);
		if (!_.isEmpty(tags)) {
			resultSwaggerMethod.tags = tags;
		}
		
		if (!_.isEmpty(endpoint.Description)) {
			resultSwaggerMethod.description = endpoint.Description;
		}
		
		if (_.isArray(consumes) && endpoint.Consumes && !_.isEqual(env.Consumes, consumes) && !_.isEmpty(consumes)) {
			resultSwaggerMethod.consumes = consumes.filter(_.isString);
		}
		
		if (_.isArray(produces) && endpoint.Produces && !_.isEqual(env.Produces, produces) && !_.isEmpty(produces)) {
			resultSwaggerMethod.produces = produces.filter(_.isString);
		}
		
		if (!_.isEmpty(parameters)) {
			resultSwaggerMethod.parameters = parameters;
		}
		
		resultSwaggerMethod.responses = responses;
		
		return resultSwaggerMethod;
	}
	
	static _mapEndpointSecurity(securedByTypes, securityDefinitions) {
		let security = [];
		for (let type in securedByTypes) {
			if (!securedByTypes.hasOwnProperty(type)) continue;
			
			let scheme = securityDefinitions[type];
			if (!scheme) {
				//definition error
				continue;
			}
			switch (type) {
				case 'basic': {
					let basic = {};
					if (scheme.name) {
						basic[scheme.name] = [];
						security.push(basic);
					}
					break;
				}
				case 'apiKey': {
					if (scheme.headers && scheme.headers.length > 0) {
						for (let i in scheme.headers) {
							if (!scheme.headers.hasOwnProperty(i)) continue;
							
							let result = {};
							result[scheme.headers[i].name] = [];
							security.push(result);
						}
					}
					if (scheme.queryString && scheme.queryString.length > 0) {
						for (let i in scheme.queryString) {
							if (!scheme.queryString.hasOwnProperty(i)) continue;
							
							let result = {};
							result[scheme.queryString[i].name] = [];
							security.push(result);
						}
					}
					break;
				}
				case 'oauth2': {
					let result = {};
					result[type] = securedByTypes[type];
					security.push(result);
					break;
				}
			}
		}
		return security;
	}
	
	static _mapSecurityDefinitions(securityDefinitions) {
		let result = {};
		for (let type in securityDefinitions) {
			if (!securityDefinitions.hasOwnProperty(type)) continue;
			
			let sd = securityDefinitions[type];
			switch (type) {
				case 'apiKey':
					if (sd.hasOwnProperty('headers') && sd.headers.length > 0) {
						for (let i in sd.headers) {
							if (!sd.headers.hasOwnProperty(i)) continue;
							
							let header = sd.headers[i];
							result[header.name] = {
								name: header.name,
								type: type,
								in: 'header'
							};
						}
					}
					if (sd.hasOwnProperty('queryString') && sd.queryString.length > 0) {
						for (let i in sd.queryString) {
							if (!sd.queryString.hasOwnProperty(i)) continue;
							
							let header = sd.queryString[i];
							result[header.name] = {
								name: header.name,
								type: type,
								in: 'query'
							};
						}
					}
					break;
				case 'oauth2': {
					let slScopes = sd.scopes, swaggerScopes = {};
					for (let i in slScopes) {
						if (!slScopes.hasOwnProperty(i)) continue;
						
						let scope = slScopes[i];
						swaggerScopes[scope.name] = scope.value;
					}
					
					result[type] = {
						type: type,
						flow: sd.flow,
						scopes: swaggerScopes
					};
					
					if (['implicit', 'accessCode'].indexOf(sd.flow) >= 0) {
						result[type]['authorizationUrl'] = sd.authorizationUrl;
					}
					
					if (['password', 'application', 'accessCode'].indexOf(sd.flow) >= 0) {
						result[type]['tokenUrl'] = sd.tokenUrl;
					}
					break;
				}
				case 'basic':
					for (let index in sd) {
						if (!sd.hasOwnProperty(index)) continue;
						let current = sd[index];
						
						let basic = {
							type: type
						};
						
						if (!_.isEmpty(current.description)) {
							basic.description = current.description;
						}
						
						result[current.name] = basic;
					}
					break;
			}
		}
		return result;
	}
	
	_mapURIParams(pathParams) {
		let parameters = [];
		if (!pathParams.properties || _.isEmpty(pathParams)) {
			return parameters;
		}
		
		for (let paramName in pathParams.properties) {
			if (!pathParams.properties.hasOwnProperty(paramName)) continue;
			
			let prop = pathParams.properties[paramName];
			let param = swaggerHelper.setParameterFields(prop, {});
			param.name = paramName;
			param.in = 'path';
			param.required = true;
			param.type = param.type || 'string';
			if (!_.isEmpty(prop.description)) {
				param.description = prop.description;
			}
			Swagger._addPatternedObjects(prop, param);
			parameters.push(param);
		}
		return parameters;
	}
	
	_mapQueryString(queryStringParams) {
		let parameters = [];
		if (queryStringParams.name && queryStringParams.name === 'queryString' && !queryStringParams.properties) {
			return queryStringParams;
		}
		if (!queryStringParams.properties) {
			return parameters;
		}
		for (let paramName in queryStringParams.properties) {
			if (!queryStringParams.properties.hasOwnProperty(paramName)) continue;
			
			let param = swaggerHelper.setParameterFields(queryStringParams.properties[paramName], {});
			param.name = paramName;
			param.in = 'query';
			param.required = (queryStringParams.hasOwnProperty('required') &&
			queryStringParams.required.indexOf(param.name) >= 0);
			parameters.push(param);
		}
		return parameters;
	}
	
	mapResponseBody(res, mimeType) {
		let item = {};
		
		item.description = res.description || '';
		
		// if response body mimeType is null, do not include schema in swagger export
		// TODO: Figure out how to set example for mimeType properly.
		// if (!mimeType) {
		//   return item;
		// }
		
		let body = jsonHelper.parse(res.body);
		if (body && !_.isEmpty(body)) {
			item.schema = this.convertRefFromModel(body);
		}
		
		if (mimeType && mimeType !== '' && res.example && res.example !== '{}' && res.example.length > 2) {
			item.examples = {};
			item.examples[mimeType] = jsonHelper.parse(res.example);
		}
		
		return item;
	}
	
	_mapResponseBody(endpoint) {
		let slResponses = endpoint.Responses;
		
		let result = {};
		for (let i in slResponses) {
			if (!slResponses.hasOwnProperty(i)) continue;
			
			let res = slResponses[i];
			let mimeType = (endpoint.Produces && endpoint.Produces.length) ? endpoint.Produces[0] : null;
			// if (!mimeType && env.Produces && env.Produces.length) {
			//   mimeType = env.Produces[0];
			// }
			result[(res.codes && res.codes.length > 0 && parseInt(res.codes[0]) ? res.codes[0] : 'default')] = this.mapResponseBody(res, mimeType);
		}
		
		return result;
	}
	
	_mapRequestBody(slRequestBody, requestTypes) {
		if (_.isEmpty(slRequestBody.body)) {
			return [];
		}
		let result = [], body = jsonHelper.parse(slRequestBody.body) || {};
		
		let param = {};
		if (!_.isEmpty(slRequestBody.description)) {
			param.description = slRequestBody.description;
		}
		
		if (!jsonHelper.isEmptySchema(body)) {
			//make sure body isn't empty
			let regex = /\"type\":[ ]*\"file\"|\"type\":[ ]*\"binary\"/;
			//export as formData only if schema includes file type property
			if (slRequestBody.body.match(regex) ||
				(!_.isEmpty(requestTypes) && ['multipart/form-data', 'application/x-www-form-urlencoded'].indexOf(requestTypes[0]) !== -1)) {
				for (let prop in body.properties) {
					if (!body.properties.hasOwnProperty(prop)) continue;
					
					param = body.properties[prop];
					param.in = 'formData';
					param.name = prop;
					if (body.required && body.required.indexOf(prop) >= 0) {
						param.required = true;
					}
					result.push(param);
				}
			} else {
				if (body.required && body.required.length <= 0) {
					delete body.required;
				}
				
				Swagger.mapExample(slRequestBody, body);
				
				param.name = 'body';
				param.in = 'body';
				param.schema = this.convertRefFromModel(body);
				
				result.push(param);
			}
		}
		
		return result;
	}
	
	_mapRequestHeaders(slHeaders) {
		let result = [];
		
		if (slHeaders) {
			for (let property in slHeaders.properties) {
				if (!slHeaders.properties.hasOwnProperty(property)) continue;
				
				let param = swaggerHelper.setParameterFields(slHeaders.properties[property], {});
				param.name = property;
				param.in = 'header';
				param.required = slHeaders.required && (slHeaders.required.indexOf(property) >= 0);
				
				let desc = slHeaders.properties[property].description;
				if (!_.isEmpty(desc)) {
					param.description = slHeaders.properties[property].description;
				}
				
				result.push(param);
			}
		}
		
		return result;
	}
	
	
	_mapSchema(slSchemas) {
		let result = {};
		for (let i in slSchemas) {
			if (!slSchemas.hasOwnProperty(i)) continue;
			
			let schema = slSchemas[i];
			let definition = this.convertRefFromModel(jsonHelper.parse(schema.Definition));
			Swagger.mapExample(schema, definition);
			result[schema.NameSpace] = definition;
		}
		return result;
	}
	
	// from ref=type1 to $ref=#/definitions/type1
	convertRefFromModel(object) {
		for (let id in object) {
			if (object.hasOwnProperty(id)) {
				let val = object[id];
				if (id == 'allOf') {
					object.allOf = val.map(function (obj) {
						if (typeof obj === 'object') return obj;
						else return {
							'$ref': '#/definitions/' + obj
						};
					});
				} else if (typeof val === 'string') {
					if (id == 'ref') {
						object.$ref = '#/definitions/' + val;
						delete object[id];
					} else if (id == 'include') {
						object.$ref = val;
						delete object[id];
					}
				} else if (val && (typeof val) === 'object') {
					object[id] = this.convertRefFromModel(val);
				}
			}
		}
		
		return object;
	}
	
	_mapEndpointTraitParameters(endpoint, existingParams) {
		if (!endpoint.traits || !endpoint.traits.length) {
			return [];
		}
		
		let params = [];
		
		for (let i in endpoint.traits) {
			if (!endpoint.traits.hasOwnProperty(i)) continue;
			
			let trait = _.find(this.project.Traits, ['_id', endpoint.traits[i]]);
			
			if (!trait) {
				continue;
			}
			
			try {
				let schema = jsonHelper.parse(trait.request.queryString);
				for (let p in schema.properties) {
					if (!schema.properties.hasOwnProperty(p)) continue;
					
					// only add it if we didn't already explicitly define it in the operation
					if (!_.find(existingParams, {name: p, in: 'query'})) {
						params.push({
							$ref: '#/parameters/' + stringHelper.computeTraitName(trait.name, p)
						});
					}
				}
			} catch (e) {
				// ignore
			}
			
			try {
				let schema = jsonHelper.parse(trait.request.headers);
				for (let p in schema.properties) {
					if (!schema.properties.hasOwnProperty(p)) continue;
					
					// only add it if we didn't already explicitly define it in the operation
					if (!_.find(existingParams, {name: p, in: 'header'})) {
						params.push({
							$ref: '#/parameters/' + stringHelper.computeTraitName(trait.name, p)
						});
					}
				}
			} catch (e) {
				// ignore
			}
		}
		
		return params;
	}
	
	_mapEndpointTraitResponses(endpoint) {
		if (!endpoint.traits || !endpoint.traits.length) {
			return [];
		}
		
		let result = {};
		for (let i in endpoint.traits) {
			if (!endpoint.traits.hasOwnProperty(i)) continue;
			
			let trait = _.find(this.project.Traits, ['_id', endpoint.traits[i]]);
			if (!trait) {
				continue;
			}
			
			for (let i in trait.responses) {
				let res = trait.responses[i],
					code = (res.codes && res.codes.length > 0 && parseInt(res.codes[0]) ? res.codes[0] : 'default');
				
				result[code] = {
					$ref: '#/responses/' + stringHelper.computeTraitName(trait.name, code)
				};
			}
		}
		
		return result;
	}
	
	_mapEndpoints(swaggerDef, env) {
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
			
			let endpoint = endpoints[i], parameters = [];
			let requestTypes = this._getRequestTypes(endpoint, parameters, env.Consumes);
			// To build parameters we need to grab data from body for supported mimeTypes
			requestTypes = _.isEmpty(requestTypes) ? env.Consumes : requestTypes;
			
			if (!swaggerDef.paths[endpoint.Path]) {
				let params = Swagger._validateParameters(this._mapURIParams(endpoint.PathParams));
				swaggerDef.paths[endpoint.Path] = params.length ? {parameters: params} : {};
			}
			
			parameters = parameters.concat(this._mapQueryString(endpoint.QueryString));
			parameters = parameters.concat(this._mapRequestBody(endpoint.Body, requestTypes));
			
			parameters = parameters.concat(this._mapRequestHeaders(endpoint.Headers));
			parameters = parameters.concat(this._mapEndpointTraitParameters(endpoint, parameters));
			parameters = Swagger._validateParameters(parameters);
			
			let responses = _.assign({}, this._mapEndpointTraitResponses(endpoint), this._mapResponseBody(endpoint, env));
			if (_.isEmpty(responses)) {
				// empty schema for swagger spec validation
				responses['default'] = {
					description: '',
					schema: {}
				};
			}
			
			// if (_.isEmpty(endpoint.Produces)) {
			//   for (let statusCode in responses) {
			//     let response = responses[statusCode];
			//     delete response.schema;
			//   }
			// }
			
			swaggerDef.paths[endpoint.Path][endpoint.Method] = this._constructSwaggerMethod(endpoint, parameters, responses, env);
			//Is it OK to include produces/consumes in all cases?
			
			if (endpoint.SecuredBy) {
				let security = Swagger._mapEndpointSecurity(endpoint.SecuredBy, this.project.Environment.SecuritySchemes);
				if (!_.isEmpty(security)) {
					swaggerDef.paths[endpoint.Path][endpoint.Method]['security'] = security;
				}
			}
			
			Swagger._addPatternedObjects(endpoint, swaggerDef.paths[endpoint.Path][endpoint.Method]);
		}
	}
	
	static _addPatternedObjects(source, target) {
		for (let key in source) {
			if (!source.hasOwnProperty(key)) continue;
			let value = source[key];
			if (_.startsWith(key, 'x-')) {
				target[key] = value;
			}
		}
	}
	
	_mapTraitParameters(traits) {
		let parameters = {};
		
		for (let i in traits) {
			if (!traits.hasOwnProperty(i)) continue;
			
			let trait = traits[i],
				params = [];
			
			try {
				let schema = jsonHelper.parse(trait.request.queryString);
				if (!jsonHelper.isEmptySchema(schema)) {
					params = params.concat(Swagger._validateParameters(this._mapQueryString(schema)));
				}
			} catch (e) {
				// ignore
			}
			
			try {
				let schema = jsonHelper.parse(trait.request.headers);
				if (!jsonHelper.isEmptySchema(schema)) {
					params = params.concat(Swagger._validateParameters(this._mapRequestHeaders(schema)));
				}
			} catch (e) {
				// ignore
			}
			
			for (let p in params) {
				let param = params[p];
				parameters[stringHelper.computeTraitName(trait.name, param.name)] = param;
			}
		}
		
		return parameters;
	}
	
	_mapTraitResponses(traits) {
		let responses = {};
		
		for (let i in traits) {
			if (!traits.hasOwnProperty(i)) continue;
			
			let trait = traits[i];
			for (let i in trait.responses) {
				let res = trait.responses[i];
				let responseName = stringHelper.computeTraitName(trait.name, (res.codes && res.codes.length > 0 && parseInt(res.codes[0]) ? res.codes[0] : 'default'));
				
				responses[responseName] = mapResponseBody(res);
			}
		}
		
		return responses;
	}
	
	_mapHostAndProtocol(env, swaggerDef) {
		let acceptedSchemes = ['http', 'https', 'ws', 'wss'];
		let hostUrl = url.parse(env.Host || '');
		let swaggerHost = hostUrl.hostname || '';
		if (swaggerHost && hostUrl.port) {
			swaggerHost = swaggerHost + ':' + hostUrl.port;
		}
		swaggerDef.Host = swaggerHost;
		
		// If host has path on it, prepend to base path
		swaggerDef.BasePath = env.BasePath;
		if (hostUrl.path && hostUrl.path !== '/') {
			swaggerDef.BasePath = urlHelper.join(hostUrl.path, env.BasePath);
		}
		
		if (Swagger._isTemplateUri(swaggerDef.basePath)) {
			Swagger._convertToTemplateUri(swaggerDef);
		}
		
		if (Array.isArray(env.Protocols) && !_.isEmpty(env.Protocols)) {
			let filteredSchemes = [];
			env.Protocols.map(function (p) {
				if (acceptedSchemes.indexOf(p.toLowerCase()) >= 0) {
					filteredSchemes.push(p.toLowerCase());
				}
			});
			swaggerDef.schemes = filteredSchemes;
		} else if (hostUrl.protocol) {
			swaggerDef.schemes = [hostUrl.protocol.split(':')[0]];
		} else {
			delete swaggerDef.schemes;
		}
	}
	
	static _isTemplateUri(uri) {
		let decodeUri = decodeURI(uri);
		return decodeUri.indexOf('{') !== -1 || decodeUri.indexOf('}') !== -1;
	}
	
	static _convertToTemplateUri(swaggerDef) {
		swaggerDef['x-basePath'] = decodeURI(swaggerDef.basePath);
		delete swaggerDef.basePath;
	}
	
	_export() {
		//TODO
		let swaggerDef = new SwaggerDefinition(this.project.Name, this.project.Description);
		let env = this.project.Environment;
		swaggerDef.info.version = env.Version;
		swaggerDef.BasePath = env.BasePath || '';
		
		this._mapHostAndProtocol(env, swaggerDef);
		
		if (env.Produces && env.Produces.length > 0) {
			swaggerDef.produces = env.Produces;
		} else {
			delete swaggerDef.produces;
		}
		
		if (env.Consumes && env.Consumes.length > 0) {
			swaggerDef.consumes = env.Consumes;
		} else {
			delete swaggerDef.consumes;
		}
		
		swaggerDef.definitions = this._mapSchema(this.project.Schemas);
		
		let parameters = this._mapTraitParameters(this.project.Traits);
		if (!_.isEmpty(parameters)) {
			swaggerDef.parameters = parameters;
		} else {
			delete swaggerDef.parameters;
		}
		
		let responses = this._mapTraitResponses(this.project.Traits);
		if (!_.isEmpty(responses)) {
			swaggerDef.responses = responses;
		} else {
			delete swaggerDef.responses;
		}
		
		swaggerDef.securityDefinitions = Swagger._mapSecurityDefinitions(this.project.Environment.SecuritySchemes);
		
		this._mapEndpoints(swaggerDef, env);
		
		//if not security definition added, then don't keep the field anymore
		if (swaggerDef.securityDefinitions && _.isEmpty(swaggerDef.securityDefinitions)) {
			delete swaggerDef.securityDefinitions;
		}
		this.data = jsonHelper.toJSON(swaggerDef);
	}
}

module.exports = Swagger;
