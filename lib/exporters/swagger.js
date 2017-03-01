const Exporter = require('./exporter'),
	jsonHelper = require('../utils/json.js'),
	stringHelper = require('../utils/strings.js'),
	urlHelper = require('../utils/url'),
	SwaggerDefinition = require('../entities/swagger/definition'),
	swaggerHelper = require('../helpers/swagger'),
	xmlHelper = require('../utils/xml.js'),
	_ = require('lodash'),
	arrayHelper = require('../utils/array.js'),
	url = require('url');

class Swagger extends Exporter {
	constructor() {
		super();
	}

	_getResponseTypes(endpoint, defaultResponseType) {
		const defRespType = defaultResponseType || [],
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
		const result = [],
			typesToInclude = ['multipart/form-data', 'application/x-www-form-urlencoded'],
			consumes = endpoint.Consumes || [],
			defReqType = defaultRequestType || [];
		
		for (const i in parameters) {
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
		const validTypes = ['string', 'number', 'integer', 'boolean', 'array', 'file'], defaultType = 'string';
		for (const i in parameters) {
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
		const tags = endpoint.tags || [];
		
		const group = _.find(env.GroupsOrder.docs, function (g) {
			return _.find(g.items, ['_id', endpoint._id]);
		});
		
		if (group) {
			tags.push(group.name);
		}
		
		return _.uniq(tags);
	}
	
	_constructSwaggerMethod(endpoint, parameters, responses, env) {
		const consumes = this._getRequestTypes(endpoint, parameters, env.Consumes);
		const produces = this._getResponseTypes(endpoint, env.Produces);
		endpoint.SetOperationId(endpoint.operationId, endpoint.Method, endpoint.Path);
		
		const resultSwaggerMethod = {};
		
		if (!_.isEmpty(endpoint.operationId)) {
			resultSwaggerMethod.operationId = endpoint.operationId;
		}
		
		if (!_.isEmpty(endpoint.Name)) {
			resultSwaggerMethod.summary = endpoint.Name;
		}
		
		const tags = this._constructTags(endpoint, env);
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
	
	static _mapEndpointSecurity(securedByTypes, slSecuritySchemes) {
		const rsecuredBy = [];
		for (const index in securedByTypes) {
			if (!securedByTypes.hasOwnProperty(index)) continue;

			let securedName;
			let scope;
			if (typeof securedByTypes[index] === 'string') {
				securedName = securedByTypes[index];
				scope = [];
			} else {
				securedName = Object.keys(securedByTypes[index])[0];
				scope = securedByTypes[index][securedName];
			}
			
			for (const index in slSecuritySchemes.oauth2) {
				if (!slSecuritySchemes.oauth2.hasOwnProperty(index)) continue;
				const current = slSecuritySchemes.oauth2[index];
				if (current.name === securedName) {
					const securedName = current.name || 'oauth2';
					const scopes = {};
					scopes[securedName] = scope;
					rsecuredBy.push(scopes);
				}
			}
			
			for (const index in slSecuritySchemes.basic) {
				if (!slSecuritySchemes.basic.hasOwnProperty(index)) continue;
				const current = slSecuritySchemes.basic[index];
				if (securedName === current.name) {
					const scopes = {};
					scopes[current.name] = scope;
					rsecuredBy.push(scopes);
				}
			}
			
			if (slSecuritySchemes.apiKey) {
				for (const index in slSecuritySchemes.apiKey) {
					if (!slSecuritySchemes.apiKey.hasOwnProperty(index)) continue;
					const current = slSecuritySchemes.apiKey[index];
					if (securedName === current.name) {
						const scopes = {};
						scopes[current.name] = scope;
						rsecuredBy.push(scopes);
					}
				}
			}
		}
			
		return rsecuredBy;
	}
	
	static _mapSecurityDefinitions(securityDefinitions) {
		const result = {};
		for (const type in securityDefinitions) {
			if (!securityDefinitions.hasOwnProperty(type)) continue;
			
			const sd = securityDefinitions[type];
			switch (type) {
				case 'apiKey':
					for (const index in sd) {
						if (!sd.hasOwnProperty(index)) continue;
						const current = sd[index];
						
						if (current.hasOwnProperty('headers') && current.headers.length > 0) {
							for (const i in current.headers) {
								if (!current.headers.hasOwnProperty(i)) continue;
								
								const header = current.headers[i];
								result[current.name] = {
									name: header.name,
									type: type,
									in: 'header'
								};
								if (current.description) {
									result[current.name]['description'] = current.description;
								}
							}
						}
						if (current.hasOwnProperty('queryString') && current.queryString.length > 0) {
							for (const i in current.queryString) {
								if (!current.queryString.hasOwnProperty(i)) continue;
								
								const header = current.queryString[i];
								result[current.name] = {
									name: header.name,
									type: type,
									in: 'query'
								};
								if (current.description) {
									result[current.name]['description'] = current.description;
								}
							}
						}
					}
					break;
				case 'oauth2': {
					for (const index in sd) {
						if (!sd.hasOwnProperty(index)) continue;
						
						const current = sd[index];

						const slScopes = current.scopes;
						const swaggerScopes = {};
						for (const i in slScopes) {
							if (!slScopes.hasOwnProperty(i)) continue;
							
							const scope = slScopes[i];
							swaggerScopes[scope.name] = scope.value;
						}
						
						const oauth2 = {
							type: type,
							flow: current.flow,
							scopes: swaggerScopes
						};
						
						if (current.description) {
							oauth2.description = current.description;
						}
						
						if (['implicit', 'accessCode'].indexOf(current.flow) >= 0) {
							oauth2['authorizationUrl'] = current.authorizationUrl;
						}
						
						if (['password', 'application', 'accessCode'].indexOf(current.flow) >= 0) {
							oauth2['tokenUrl'] = current.tokenUrl;
						}
						
						result[current.name] = oauth2;
					}
					break;
				}
				case 'basic':
					for (const index in sd) {
						if (!sd.hasOwnProperty(index)) continue;
						const current = sd[index];
						
						const basic = {
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
		const parameters = [];
		if (!pathParams.properties || _.isEmpty(pathParams)) {
			return parameters;
		}
		
		for (const paramName in pathParams.properties) {
			if (!pathParams.properties.hasOwnProperty(paramName)) continue;
			
			const prop = pathParams.properties[paramName];
			const param = swaggerHelper.setParameterFields(prop, {});
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
		const parameters = [];
		if (queryStringParams.name && queryStringParams.name === 'queryString' && !queryStringParams.properties) {
			queryStringParams.in = 'query';
			return queryStringParams;
		}
		if (!queryStringParams.properties) {
			return parameters;
		}
		for (const paramName in queryStringParams.properties) {
			if (!queryStringParams.properties.hasOwnProperty(paramName)) continue;
			
			let param = this._convertExamples(queryStringParams.properties[paramName], false);
			param = swaggerHelper.setParameterFields(param, {});
			param.name = paramName;
			param.in = 'query';
			param.required = (queryStringParams.hasOwnProperty('required') &&
			queryStringParams.required.indexOf(param.name) >= 0);
			parameters.push(param);
		}
		return parameters;
	}
	
	mapResponseBody(res, mimeType) {
		const item = {};
		
		item.description = res.description || '';
		
		// if response body mimeType is null, do not include schema in swagger export
		// TODO: Figure out how to set example for mimeType properly.
		// if (!mimeType) {
		//   return item;
		// }
		
		const body = jsonHelper.parse(res.body);
		if (body && !_.isEmpty(body)) {
			if (body.hasOwnProperty('$schema'))
				delete body['$schema'];
			item.schema = this.convertRefFromModel(body, false);
		}
		
		if (mimeType && mimeType !== '' && res.example && res.example !== '{}' && res.example.length > 2) {
			item.examples = {};
			item.examples[mimeType] = jsonHelper.parse(res.example);
		}
		
		if (res.headers) {
			this.mapHeaderProperties(res.headers);
			item.headers = res.headers;
			const headers = item.headers;
			for (const id in headers) {
				if (!headers.hasOwnProperty(id)) continue;
				headers[id] = this._convertExamples(headers[id], false);
			}
		}
		Swagger._addPatternedObjects(res, item);
		
		return item;
	}

	mapHeaderProperties(headers){
		for (const i in headers) {
			if (!headers.hasOwnProperty(i)) continue;
      let header = headers[i];
			if (header.hasOwnProperty('required')) {
				this.addExtension(header, 'x-raml-required', header['required']);
				delete header.required;
			}
			if (header.hasOwnProperty('repeat')){
				this.addExtension(header, 'x-raml-repeat', header['repeat']);
				delete header.repeat;
			}
		}
	}

	addExtension(object, id, value) {
		if (_.isEmpty(this.options) || !this.options.hasOwnProperty('noExtension') || this.options.noExtension === true) return;
		// if (!_.isEmpty(this.options) && this.options.hasOwnProperty('noExtension') && this.options['noExtension'] === true) return;

		object[id] = value;
	}

	_mapResponseBody(endpoint) {
		const slResponses = endpoint.Responses;
		
		const result = {};
		for (const i in slResponses) {
			if (!slResponses.hasOwnProperty(i)) continue;
			
			const res = slResponses[i];
			const mimeType = (endpoint.Produces && endpoint.Produces.length) ? endpoint.Produces[0] : null;
			// if (!mimeType && env.Produces && env.Produces.length) {
			//   mimeType = env.Produces[0];
			// }
			const code = (res.codes && res.codes.length > 0 && parseInt(res.codes[0]) ? res.codes[0] : 'default');
			result[code] = this.mapResponseBody(res, mimeType);
		}
		
		return result;
	}
	
	_mapRequestBodies(slRequestBodies, mimeTypes) {
		const result = {};
		for (const id in slRequestBodies) {
			if (!slRequestBodies.hasOwnProperty(id)) continue;
			
			const requestBody = slRequestBodies[id];
			this.addExtension(result, 'x-raml-body-' + requestBody.mimeType, this._mapRequestBody(requestBody, mimeTypes, false));
		}
		
		return result;
	}
	
	_mapRequestBody(slRequestBody, requestTypes, multipleBodies) {
		const result = [];
		
		if (_.isEmpty(slRequestBody.body)) {
			return result;
		}

		const body = jsonHelper.parse(slRequestBody.body) || {};
		
		let param = {};
		if (!_.isEmpty(slRequestBody.description)) {
			param.description = slRequestBody.description;
		}

		if (!jsonHelper.isEmptySchema(body)) {
			//make sure body isn't empty
			const regex = /\"type\":[ ]*\"file\"|\"type\":[ ]*\"binary\"/;
			//export as formData only if schema includes file type property
			if (jsonHelper.stringify(slRequestBody.body, 4).match(regex) ||
				(!_.isEmpty(requestTypes) && ['multipart/form-data', 'application/x-www-form-urlencoded'].indexOf(requestTypes[0]) !== -1)) {
				if (body.properties) {
					for (const prop in body.properties) {
						if (!body.properties.hasOwnProperty(prop)) continue;
						
						param = body.properties[prop];
						param.in = 'formData';
						param.name = prop;
						if (body.required && body.required.indexOf(prop) >= 0) {
							param.required = true;
						}
						// if (param.hasOwnProperty('type')) {
						// 	param.type = multipleBodies ? {type: 'object'} : param.type;
						// }
						result.push(param);
					}
				} else {
					param.in = 'formData';
					param.name = 'formData';
					if (body.ref) {
						this.addExtension(param, 'x-raml-type', body.ref);
					}
					if (param.hasOwnProperty('type')) {
						param.type = multipleBodies ? {type: 'object'} : param.type;
					}
					if (body.hasOwnProperty('type') && body.type === 'file')
						param.type = body.type;
					
					result.push(param);
				}
			} else {
				if (body.required && body.required.length <= 0) {
					delete body.required;
				}
				
				param.name = 'body';
				param.in = 'body';
				param.schema = multipleBodies ? {type: 'object'} : this.convertRefFromModel(body, false);
				if (!_.isEmpty(slRequestBody.example)) {
					if (!xmlHelper.isXml(slRequestBody.example))
						param.schema.example = jsonHelper.parse(slRequestBody.example);
					else
						param.schema.example = slRequestBody.example;
				}
				
				result.push(param);
			}
		}
		
		return result;
	}
	
	_mapRequestHeaders(slHeaders) {
		const result = [];
		
		if (slHeaders) {
			for (const property in slHeaders.properties) {
				if (!slHeaders.properties.hasOwnProperty(property)) continue;
				
				let param = this._convertExamples(slHeaders.properties[property], false);
				param = swaggerHelper.setParameterFields(param, {});
				param.name = property;
				param.in = 'header';
				param.required = slHeaders.required && (slHeaders.required.indexOf(property) >= 0);
				
				const desc = slHeaders.properties[property].description;
				if (!_.isEmpty(desc)) {
					param.description = slHeaders.properties[property].description;
				}
				
				//check if parameter contains pattern or example attributes.
				param = this._hasAttributes(param, ['example', 'pattern']);
				
				result.push(param);
			}
		}
		
		return result;
	}
	
	_hasAttributes(object, atts) {
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;
			const val = object[id];
			if (atts.indexOf(id) >= 0) {
				this.addExtension(object, 'x-raml-' + id, val);
				delete object[id];
			} else {
				if (typeof val === 'object') {
					object[id] = this._hasAttributes(val, atts);
				}
			}
		}
		return object;
	}
	
	_mapSchema(slSchemas) {
		const result = {};
		for (const i in slSchemas) {
			if (!slSchemas.hasOwnProperty(i)) continue;
			
			const schema = slSchemas[i];
			let definition = jsonHelper.parse(schema.Definition);
			if (definition.hasOwnProperty('$schema')) {
				delete definition['$schema'];
				delete definition['id'];
			}
			definition = this.convertRefFromModel(definition, true);
			result[schema.NameSpace] = definition;
		}
		return result;
	}

	replaceCustomProperties(object) {
		const oldId = '__custom-';
		const newId = 'x-raml-';
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;

			if (typeof object[id] === 'object') {
				this.replaceCustomProperties(object[id]);
			}

			if (_.startsWith(id, oldId)) {
				const replaceId = _.replace(id, new RegExp(oldId,"g"), newId);
				this.addExtension(object, replaceId, object[id]);
				delete object[id];
			}
		}
	}
	
	// from ref=type1 to $ref=#/definitions/type1
	convertRefFromModel(object, isSchema, isProperty) {
		if (xmlHelper.isXml(object)) {
			const o = object;
			object = {type: "object"};
			this.addExtension(object, 'x-raml-xsd-definition', o);
		}
		if (object.hasOwnProperty('definitions') && object.hasOwnProperty('items') && object.type == 'array') {
			object = Swagger.convertDefinitions(object);
		}
		for (let id in object) {
			if (!object.hasOwnProperty(id) || swaggerHelper.isExtension(id)) continue;
			const val = object[id];
			if (id == 'allOf') {
				const allOf = object.allOf;
				for (const key in allOf) {
					if (!allOf.hasOwnProperty(key)) continue;
					const obj = allOf[key];
					if (typeof obj === 'object')
						allOf[key] = this.convertRefFromModel(obj, isSchema);
					else
						allOf[key] = { '$ref': '#/definitions/' + obj };
				}
				//check if all elements from allOf are the same.
				//if yes, remove allOf attribute.
				if (arrayHelper.allEqual(allOf)) {
					_.merge(object, object.allOf[0]);
					delete object.allOf;
				}
			} else if (id === 'schemaPath') {
				this.addExtension(object, 'x-raml-xsd-definition', val);
				delete object[id];
			} else if (typeof val === 'string') {
				if (id == 'ref') {
					object.$ref = '#/definitions/' + val;
					delete object[id];
					id = '$ref';
				} else if (id == 'include') {
					object.$ref = val;
					delete object[id];
					id = '$ref';
				}
			} else if (val && typeof val === 'object') {
				if (id === 'example' || id === 'examples') {
					object = this._convertExamples(object, isSchema);
					id = 'example';
				} else if (id !== 'xml'){
					object[id] = this.convertRefFromModel(val, isSchema, id == 'properties' && !isProperty);
				}
			}
			if (!_.isArray(object) && typeof object == 'object' && !isProperty && swaggerHelper.getSupportedSchemaFields.indexOf(id) < 0 && !_.startsWith(id, 'x-raml')){
				this.addExtension(object, 'x-raml-' + id, val);
				delete object[id];
			}
		}

		return object;
	}

	static convertDefinitions(object){
		if (object.items.hasOwnProperty('$ref')) {
			let ref = object.items.$ref.split('/');
			let item = ref[ref.length - 1];
			let definitions = object.definitions;
			for (const id in definitions) {
				if (!definitions.hasOwnProperty(id)) continue;
				if (id === item){
					object['items'] = definitions[id];
					delete definitions[id];
					if (_.isEmpty(object.definitions))
						delete object['definitions'];
					break;
				}
			}
		}
		return object;
	}
	
	_convertExamples(object, isSchema) {
		if (isSchema){
			if (object.hasOwnProperty('examples')) {
				const val = object.examples;
				if (!_.isArray(val)) return val;
				object.example = val[0];
				if (val.length > 1) {
					let additionalExamples = [];
					for (let i = 1; i < val.length; i++) {
						additionalExamples.push(val[i]);
					}
					this.addExtension(object, 'x-raml-additional-examples', additionalExamples);
				}
				delete object.examples;
			}
		} else if (object.hasOwnProperty('example')) {
			this.addExtension(object, 'x-raml-example', object.example);
			delete object.example;
		} else if (object.hasOwnProperty('examples')) {
			const val = object.examples;
			if (!_.isArray(val)) return val;
			let examples = [];
			for (let i = 0; i < val.length; i++) {
				examples.push(val[i]);
			}
			this.addExtension(object, 'x-raml-example', examples);
			delete object.examples;
		}
		
		return object;
	}
	
	_mapEndpointTraitParameters(endpoint, existingParams) {
		if (!endpoint.traits || !endpoint.traits.length) {
			return [];
		}
		
		const params = [];
		
		for (const i in endpoint.traits) {
			if (!endpoint.traits.hasOwnProperty(i)) continue;

			let traitName = endpoint.traits[i];
			if (_.isObject(traitName) && !_.isEmpty(traitName)) {
				traitName = Object.keys(traitName)[0];
			}
			const trait = _.find(this.project.Traits, ['_id', traitName]);
			
			if (!trait) {
				continue;
			}

			//if trait has parameters, copy to method and declare it as x-raml-traits
			
			try {
				const schema = jsonHelper.parse(trait.request.queryString);
				for (const p in schema.properties) {
					if (!schema.properties.hasOwnProperty(p)) continue;
					
					// only add it if we didn't already explicitly define it in the operation
					if (!_.find(existingParams, {name: p, in: 'query'})) {
						//check if trait is parametric.
						params.push({
							$ref: '#/parameters/' + stringHelper.computeTraitName(trait.name, p)
						});
					}
				}
			} catch (e) {
				// ignore
			}
			
			try {
				const schema = jsonHelper.parse(trait.request.headers);
				for (const p in schema.properties) {
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
		
		const result = {};
		for (const i in endpoint.traits) {
			if (!endpoint.traits.hasOwnProperty(i)) continue;

			let traitName = endpoint.traits[i];
			if (_.isObject(traitName) && !_.isEmpty(traitName)) {
				traitName = Object.keys(traitName)[0];
			}
			const trait = _.find(this.project.Traits, ['_id', traitName]);

			if (!trait) {
				continue;
			}
			
			for (const i in trait.responses) {
				const res = trait.responses[i],
					code = (res.codes && res.codes.length > 0 && parseInt(res.codes[0]) ? res.codes[0] : 'default');
				
				result[code] = {
					$ref: '#/responses/' + stringHelper.computeTraitName(trait.name, code)
				};
			}
		}
		
		return result;
	}
	
	_mapResources(swaggerDef, env) {
		const resources = this.project.Resources;
		if (!_.isEmpty(resources)) {
			for (const index in resources) {
				if (!resources.hasOwnProperty(index)) continue;
				
				const resource = resources[index];
				this._mapEndpoints(swaggerDef, env, resource.endpoints);
				
				if (resource.hasOwnProperty('is')) {
					this.addExtension(swaggerDef.paths[resource.path], 'x-raml-is', resource.is);
				}
				
				if (!_.isEmpty(resource.annotations) || resource.displayName || resource.description) {
					if (!swaggerDef.paths[resource.path]) {
						swaggerDef.paths[resource.path] = {};
					}
				}
				
				for (const id in resource.annotations) {
					if (!resource.annotations.hasOwnProperty(id)) continue;
					const annotation = resource.annotations[id];
					swaggerDef.paths[resource.path][id] = annotation || '';
				}
				
				if (resource.displayName) {
					this.addExtension(swaggerDef.paths[resource.path], 'x-raml-resource-displayName', resource.displayName);
				}
				
				if (resource.description) {
					this.addExtension(swaggerDef.paths[resource.path], 'x-raml-resource-description', resource.description);
				}
			}
		}
		else {
			this._mapEndpoints(swaggerDef, env, this.project.Endpoints);
		}
	}
	
	_mapEndpoints(swaggerDef, env, endpoints) {
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
			let parameters = [];
			let requestTypes = this._getRequestTypes(endpoint, parameters, env.Consumes);
			// To build parameters we need to grab data from body for supported mimeTypes
			requestTypes = _.isEmpty(requestTypes) ? env.Consumes : requestTypes;
			
			if (!swaggerDef.paths[endpoint.Path]) {
				const params = Swagger._validateParameters(this._mapURIParams(endpoint.PathParams));
				swaggerDef.paths[endpoint.Path] = params.length ? {parameters: params} : {};
			}
			
			parameters = parameters.concat(this._mapQueryString(endpoint.QueryString));
			const requestBodySize = _.size(endpoint.Body);
			if (requestBodySize > 1) {
				parameters = parameters.concat(this._mapRequestBody(endpoint.Body[0], requestTypes, true));
			}
			else {
				if (!_.isEmpty(endpoint.Body)) {
					parameters = parameters.concat(this._mapRequestBody(endpoint.Body[0], requestTypes, false));
				}
			}
			
			parameters = parameters.concat(this._mapRequestHeaders(endpoint.Headers));
			parameters = parameters.concat(this._mapEndpointTraitParameters(endpoint, parameters));
			parameters = Swagger._validateParameters(parameters);
			
			const responses = _.assign({}, this._mapResponseBody(endpoint, env), this._mapEndpointTraitResponses(endpoint));
			if (_.isEmpty(responses)) {
				// empty schema for swagger spec validation
				responses['default'] = {
					description: '',
					schema: {}
				};
			}
			
			// if (_.isEmpty(endpoint.Produces)) {
			//   for (const statusCode in responses) {
			//     const response = responses[statusCode];
			//     delete response.schema;
			//   }
			// }
			
			swaggerDef.paths[endpoint.Path][endpoint.Method] = this._constructSwaggerMethod(endpoint, parameters, responses, env);
			if (requestBodySize > 1) {
				const bodies = this._mapRequestBodies(endpoint.Body, requestTypes);
				_.merge(swaggerDef.paths[endpoint.Path][endpoint.Method], bodies);
			}
			//Is it OK to include produces/consumes in all cases?

			if (endpoint.hasOwnProperty('is')) {
				this.addExtension(swaggerDef.paths[endpoint.Path][endpoint.Method], 'x-raml-is', endpoint.is);
			}
			
			if (endpoint.SecuredBy) {
				const security = Swagger._mapEndpointSecurity(endpoint.SecuredBy, this.project.Environment.SecuritySchemes);
				if (!_.isEmpty(security)) {
					swaggerDef.paths[endpoint.Path][endpoint.Method]['security'] = security;
				}
			}
			
			Swagger._addPatternedObjects(endpoint, swaggerDef.paths[endpoint.Path][endpoint.Method]);
		}
	}
	
	static _addPatternedObjects(source, target) {
		for (const key in source) {
			if (!source.hasOwnProperty(key)) continue;
			const value = source[key];
			if (_.startsWith(key, 'x-')) {
				target[key] = value;
			}
		}
	}
	
	_mapTraitParameters(traits) {
		const parameters = {};
		
		for (const i in traits) {
			if (!traits.hasOwnProperty(i)) continue;
			
			const trait = traits[i];
			let params = [];
			
			try {
				const schema = jsonHelper.parse(trait.request.queryString);
				if (!jsonHelper.isEmptySchema(schema)) {
					params = params.concat(Swagger._validateParameters(this._mapQueryString(schema)));
				}
			} catch (e) {
				// ignore
			}
			
			try {
				const schema = jsonHelper.parse(trait.request.headers);
				if (!jsonHelper.isEmptySchema(schema)) {
					params = params.concat(Swagger._validateParameters(this._mapRequestHeaders(schema)));
				}
			} catch (e) {
				// ignore
			}
			
			for (const p in params) {
				const param = params[p];
				parameters[stringHelper.computeTraitName(trait.name, param.name)] = param;
			}
		}
		
		return parameters;
	}
	
	_mapTraitResponses(traits) {
		const responses = {};
		
		for (const i in traits) {
			if (!traits.hasOwnProperty(i)) continue;
			
			const trait = traits[i];
			for (const i in trait.responses) {
				const res = trait.responses[i];
				const responseName = stringHelper.computeTraitName(trait.name, (res.codes && res.codes.length > 0 && parseInt(res.codes[0]) ? res.codes[0] : 'default'));

				const response = this.mapResponseBody(res);
				if (response.hasOwnProperty('schema') && response['schema'].hasOwnProperty('$ref') && _.includes(response['schema']['$ref'], '<<')) {
					this.addExtension(response['schema'], 'x-raml-type', response['schema']['$ref']);
					delete response['schema']['$ref'];
				}
        responses[responseName] = response;
			}
		}
		
		return responses;
	}
	
	_mapHostAndProtocol(env, swaggerDef) {
		const acceptedSchemes = ['http', 'https', 'ws', 'wss'];
		const hostUrl = url.parse(env.Host || '');
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
			const filteredSchemes = [];
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
		const decodeUri = decodeURI(uri);
		return decodeUri.indexOf('{') !== -1 || decodeUri.indexOf('}') !== -1;
	}
	
	static _convertToTemplateUri(swaggerDef) {
		swaggerDef['x-basePath'] = decodeURI(swaggerDef.basePath);
		delete swaggerDef.basePath;
	}
	
	_export() {
		//TODO
		const swaggerDef = new SwaggerDefinition(this.project.Name, this.project.Description);
		this.replaceCustomProperties(this.project);
		const env = this.project.Environment;
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
		
		
		let definitions = this._mapSchema(this.project.Schemas);
		if (!_.isEmpty(definitions)) {
			swaggerDef.definitions = definitions;
		}
		
		const parameters = this._mapTraitParameters(this.project.Traits);
		if (!_.isEmpty(parameters)) {
			swaggerDef.parameters = parameters;
		} else {
			delete swaggerDef.parameters;
		}

		const parametricParameters = this._mapTraitParameters(this.project.parametricTraits);
		if (!_.isEmpty(parametricParameters)) {
			this.addExtension(swaggerDef, 'x-raml-traits', parametricParameters);
		} else {
			delete swaggerDef['x-raml-traits'];
		}

		const responses = this._mapTraitResponses(this.project.Traits);
		if (!_.isEmpty(responses)) {
			swaggerDef.responses = responses;
		} else {
			delete swaggerDef.responses;
		}
		
		swaggerDef.securityDefinitions = Swagger._mapSecurityDefinitions(this.project.Environment.SecuritySchemes);
		
		this._mapResources(swaggerDef, env);
		
		//if not security definition added, then don't keep the field anymore
		if (swaggerDef.securityDefinitions && _.isEmpty(swaggerDef.securityDefinitions)) {
			delete swaggerDef.securityDefinitions;
		}
		
		this.addExtension(swaggerDef, 'x-raml-uses', this.project.uses);
		Swagger._addPatternedObjects(this.project, swaggerDef);
		
		this.data = jsonHelper.toJSON(swaggerDef);
	}
}

module.exports = Swagger;
