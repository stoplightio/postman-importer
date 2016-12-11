const parser = require('swagger-parser'),
		Method = require('../entities/swagger/method'),
    Endpoint = require('../entities/endpoint'),
    Schema = require('../entities/schema'),
    Importer = require('./importer'),
    Project = require('../entities/project'),
    jsonHelper = require('../utils/json'),
    swaggerHelper = require('../helpers/swagger'),
    YAML = require('js-yaml'),
    _ = require('lodash');

function Swagger() {
  this.dereferencedAPI = null;
}

const referenceRegex = /\/(parameters|responses)\/(.+)/i;
function needDeReferenced(param) {
  if (!param || !param.$ref) {
    return false;
  }

  return param.$ref.match(referenceRegex);
}

function mapExample(data, target) {
  if (data.example) {
    target.example = jsonHelper.stringify(data.example, 4);
    delete data.example;
  }
}

Swagger.prototype = new Importer();

Swagger.prototype._mapSecurityDefinitions = function(securityDefinitions) {
  let result = {};
  for(let name in securityDefinitions) {
    if (!securityDefinitions.hasOwnProperty(name)) continue;
    let type = securityDefinitions[name].type;
    if (!result.hasOwnProperty(type)) {
      result[type] = {};
    }
    let sd = securityDefinitions[name];
    switch(type) {
      case 'apiKey':
        let keyPlaceHolder = (sd.in === 'header')?'headers':'queryString';
        if (!result[type].hasOwnProperty(keyPlaceHolder)){
          result[type][keyPlaceHolder] = [];
        }
        result[type][keyPlaceHolder].push({
					externalName: name,
          name: sd.name,
          value: '',
					description: sd.description
        });
        break;
      case 'oauth2':
        result[type] = {
          name: name,
          authorizationUrl: sd.authorizationUrl || '',
          //scopes: slScopes,
          tokenUrl: sd.tokenUrl || ''
        };

        let slScopes = [], swaggerScopes = sd.scopes;

        if (swaggerScopes) {
          for(let key in swaggerScopes) {
            if (!swaggerScopes.hasOwnProperty(key)) continue;
            let scope = {};
            scope['name'] = key;
            scope['value'] = swaggerScopes[key];
            slScopes.push(scope);
          }
        }

        if (sd.flow) {
          result[type]['flow'] = sd.flow;
        }

        if (!_.isEmpty(slScopes)) {
          result[type]['scopes'] = slScopes;
        }

        break;
      case 'basic':
        result[type] = {
          name: name,
          value: '',
          description: sd.description || ''
        };
        break;
    }
  }
  return result;
};

Swagger.prototype._mapSchema = function(schemaDefinitions) {
  let result = [];
  for (let schemaName in schemaDefinitions) {
    if (!schemaDefinitions.hasOwnProperty(schemaName)) continue;
    let sd = new Schema(schemaName);
    sd.Name = schemaName;
    //create a clone to remove extension properties
    let schemaDataClone = _.clone(schemaDefinitions[schemaName]);
    let re = /^x-/; //properties to avoid
    for(let prop in schemaDataClone) {
      if (schemaDataClone.hasOwnProperty(prop) && prop.match(re)) {
        delete schemaDataClone[prop];
      }
    }

    mapExample(schemaDataClone, sd);
    sd.Definition = schemaDataClone;
    result.push(sd);
  }
  return result;
};

Swagger.prototype._mapQueryString = function(params, skipParameterRefs) {
  let queryString = {type:'object', properties: {}, required: []};
  for (let i in params) {
    if (!params.hasOwnProperty(i)) continue;
    let param = params[i];

    if (skipParameterRefs && needDeReferenced(param)) {
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
};

Swagger.prototype._mapURIParams = function(params, resolvedParameters) {
  let pathParams = {type:'object', properties: {}, required: []};
  for (let i in params) {
    if (!params.hasOwnProperty(i)) continue;
    let param = params[i];
    if (needDeReferenced(param) && resolvedParameters) {
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
};

Swagger.prototype._mapRequestBody = function(params, resolvedParams) {
  if (_.isEmpty(params) ||
      !_.some(params, {'in': 'body'}) &&
      !_.some(params, {'in': 'formData'})) {
    return;
  }

  let data = {
    body: {properties: {}, required: []},
    example: ''
  };

  for (let i in params) {
    if (!params.hasOwnProperty(i)) continue;
    let param = params[i];

    if (needDeReferenced(param)) {
      param = resolvedParams[i];
    }

    if (param.in && param.in !== 'body' && param.in !== 'formData') {
      continue;
    }
    switch(param.in) {
      case 'body':
        mapExample(param.schema, data);
        data.body = param.schema;
				if (param.name) {
					data.name = param.name;
				}
        break;
      default:
        let prop = {};
        prop = swaggerHelper.setParameterFields(param, prop);
        if (param.required) {
          data.body.required.push(param.name);
        }
        data.body.properties[param.name] = prop;
    }

    if (param.description) {
        data.description = jsonHelper.stringify(param.description);
    }

  }
  //remove required field if doesn't have anything inside it
  if (data.body.required && data.body.required.length == 0) {
    delete data.body.required;
  }
  return data;
};

Swagger.prototype._mapResponseBody = function(responses, skipParameterRefs, resolvedResponses, $refs) {
  let data = [];
  for (let code in responses) {
    if (!responses.hasOwnProperty(code)) continue;
    let res = {body: {}, example: '', codes: []}, description = '';
	
		let response = responses[code];
		
		if (skipParameterRefs && needDeReferenced(response) &&
      (response.$ref.match(/trait/) || _.includes($refs, response.$ref))) {
      continue;
    }
    
    let needBeReferenced = needDeReferenced(response);
		if (needBeReferenced && resolvedResponses) {
			let resolvedResponse = this._getResponses(response, resolvedResponses[code]);
			let schema = resolvedResponse.schema;
			description = jsonHelper.stringify(resolvedResponse.description || '');
			res.body = schema;
    } else if (response.schema) {
      let schema = response.schema;
      if (needDeReferenced(response.schema)) {
        description = jsonHelper.stringify(resolvedResponses[code].description || '');
        schema = resolvedResponses[code].schema;
      }
      res.body = schema;
    }

    this._mapResponseExample(needBeReferenced ? resolvedResponses[code] : response, res);
		this._mapResponseHeaders(needBeReferenced ? resolvedResponses[code] : response, res);
		this._mapResponseDescription(needBeReferenced ? resolvedResponses[code] : response, description, res);
    
    res.codes.push(String(code));

    data.push(res);
  }
	
	let extensions = this._getExtensionsFrom(responses);
	if (!_.isEmpty(extensions)) {
		data.extensions = extensions;
	}

  return data;
};

Swagger.prototype._mapResponseDescription = function(responseBody, description, res) {
	res.description = jsonHelper.stringify(description || responseBody.description || '');
};

Swagger.prototype._mapResponseHeaders = function(responseBody, res) {
	if (responseBody.hasOwnProperty('headers') && !_.isEmpty(responseBody.headers)) {
		res.headers = {
			properties: responseBody.headers
		};
	}
};

Swagger.prototype._mapResponseExample = function(responseBody, res) {
	if (responseBody.hasOwnProperty('examples') && !_.isEmpty(responseBody.examples)) {
		let examples = responseBody.examples;
		
		if (_.isArray(examples)) {
			for(let t in examples) {
				if (!examples.hasOwnProperty(t)) continue;
				if (t === resType) {
					res.example = jsonHelper.stringify(examples[t], 4);
				}
			}
		} else {
			res.example = jsonHelper.stringify(examples, 4);
		}
	}
};

Swagger.prototype._mapRequestHeaders = function(params, skipParameterRefs) {
  let data = {type: 'object', properties: {}, required: []};
  for (let i in params) {
    if (!params.hasOwnProperty(i)) continue;
    let param = params[i];

    if (skipParameterRefs && needDeReferenced(param)) {
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
};

Swagger.prototype._parseData = function(dataOrPath, options) {
	let me = this;

	return new Promise(function(resolve, reject) {
		
		let validateOptions = _.cloneDeep(options || {});
		
		let customOptions = {
			schema: false,
			spec: false
		};
		
		if (options && options.hasOwnProperty('validate') && options.validate === true) {
			customOptions = {
				schema: true,
				spec: true
			};
		}
		
		validateOptions.validate = customOptions;
		
		// with validation
		//in case of data, if not cloned, referenced to resolved data
		let dataCopy = _.cloneDeep(dataOrPath);
		parser.validate(dataCopy, validateOptions)
			.then(function() {
				me._doParseData(dataOrPath, options || {}, resolve, reject);
			})
			.catch(function(err) {
				reject(err);
			});
	});
};

Swagger.prototype._doParseData = function(dataOrPath, options, resolve, reject) {
  let me = this;

  // without validation
	parser.parse(dataOrPath, options)
		.then(function(api) {
			let apiData = JSON.parse(JSON.stringify(api));
			
			me.data = api;
			let parseFn;
			if (typeof dataOrPath === 'string') {
				parseFn = parser.dereference(dataOrPath, JSON.parse(JSON.stringify(api)), options);
			} else {
				parseFn = parser.dereference(JSON.parse(JSON.stringify(api)), options);
			}
			
			parseFn
				.then(function(dereferencedAPI) {
					if (options && options.expand) {
						me.data = dereferencedAPI;
					} else {
						me.dereferencedAPI = dereferencedAPI;
					}
					resolve();
				})
				.catch(function(err) {
					reject(err);
				});
		})
		.catch(function(err) {
			reject(err);
		});
};

// Load a swagger spec by local or remote file path
Swagger.prototype.loadFile = function (path, options) {
  return this._parseData(path, options);
};

// Load a swagger spec by string data
Swagger.prototype.loadData = function(data, options) {
  let self = this, parsedData;

  return new Promise(function(resolve, reject) {
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

    self._parseData(parsedData, options).then(function () {
    	resolve();
		}).catch(function (err) {
			reject(err);
		});
			// .then(resolve())
			// .catch(function(err) {
    		// reject(err);
		// });
  });
};

//for now, if 'application/json' exist in supported type, use that
Swagger.prototype.findDefaultMimeType = function(mimeTypes) {
  if (!mimeTypes || mimeTypes.length <= 0) {
    return null;
  }

  for (let i in mimeTypes) {
    if (!mimeTypes.hasOwnProperty(i)) continue;
    if (mimeTypes[i] === 'application/json') {
      return mimeTypes[i];
    }
  }

  return mimeTypes[0];
};

Swagger.prototype._mapEndpointTrait = function(params, resolvedParameters) {
  let traits = [];
  for (let i in params) {
    if (!params.hasOwnProperty(i)) continue;
    let param = params[i];

    if (!needDeReferenced(param)) {
      continue;
    }

    let parts = param.$ref.split('/'),
        traitParts = parts[parts.length - 1].split(':'),
        name = traitParts[0];
    if (traitParts[0] === 'trait') {
      name = traitParts[1];
    }
    
    if (resolvedParameters && resolvedParameters[name] && resolvedParameters[name].in && resolvedParameters[name].in === 'path') {
			continue;
		}
    traits.push(name);
  }

  return traits;
};

Swagger.prototype._mapEndpointTraits = function(params, responses) {
  let traits = [];

  traits = traits.concat(this._mapEndpointTrait(params));
  // traits = traits.concat(this._mapEndpointTrait(responses));

  return _.uniq(traits);
};

Swagger.prototype._getParams = function(params, resolvedParameters, condition) {
	if (_.isEmpty(params)) return params;
	
	let result = [];
	for (let id in params) {
		if (!params.hasOwnProperty(id)) continue;
		let param = params[id];
		if (condition && !condition(param)) {
			continue;
		}
		let deReferenced = needDeReferenced(param);
		if (deReferenced && deReferenced.length) continue;
		
		let isFilePath = this._isFilePath(param);
		if (isFilePath && resolvedParameters) {
			param = resolvedParameters[id];
		}
		result.push(param);
	}
	
	return result;
};

Swagger.prototype._getResponses = function(response, resolvedResponse) {
	let result;
	let deReferenced = needDeReferenced(response);
	let isFilePath = this._isFilePath(response);
	if ((deReferenced || isFilePath) && resolvedResponse) {
		if (isFilePath) {
			result = resolvedResponse;
		} else {
			let responseName = deReferenced[deReferenced.length - 1];
			result = this.data.responses[responseName];
			if (result.$ref) {
				result = resolvedResponse;
			}
		}
	}
	
	return result;
};

Swagger.prototype._isFilePath = function(param) {
	if (!param || !param.$ref) {
		return false;
	}
	
	let filePath = param.$ref.split('#')[0];
	return filePath.split('.').length == 2;
};

Swagger.prototype._mapEndpoints = function(consumes, produces) {
  for (let path in this.data.paths) {
    if (!this.data.paths.hasOwnProperty(path)) continue;
		if (_.startsWith(path, 'x-')) continue; //avoid custom extensions
		
		let methods = this.data.paths[path].hasOwnProperty('$ref') ? this.dereferencedAPI.paths[path] : this.data.paths[path];
		let resolvedPathParames = {};
		let globalParamsURI = {};
		let pathParamRef = [];
		let globalParamsNonURI = [];
    if (methods.parameters) {
      resolvedPathParames = this.dereferencedAPI ? this.dereferencedAPI.paths[path].parameters : methods.parameters;
      globalParamsURI = this._mapURIParams(methods.parameters, resolvedPathParames);
	
			pathParamRef = this._mapEndpointTrait(methods.parameters, this.dereferencedAPI.parameters);
			if (!_.isEmpty(pathParamRef)) {
				this.project.addPathParamRef(path, pathParamRef);
			}
	
			globalParamsNonURI = this._getParams(methods.parameters, resolvedPathParames, function(param) {
				return !(param.in && param.in == 'path');
			});
    }
    
    for (let method in methods) {
      if (!methods.hasOwnProperty(method)) continue;
			if (method === 'parameters') continue;
			
			let currentMethod = new Method(methods[method], this.dereferencedAPI ? this.dereferencedAPI.paths[path][method] : methods[method]);
      let currentMethodResolved = this.dereferencedAPI ? this.dereferencedAPI.paths[path][method] : methods[method];
      let endpoint = new Endpoint(currentMethod.summary || '');
	
			let extensions = this._getExtensionsFrom(currentMethodResolved);
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

			let params = _.union(globalParamsNonURI, this._getParams(currentMethod.parameters, currentMethodResolved.parameters));
      let c = [];
      if (_.some(params, {'in': 'body'})) {
        c.push('application/json');
      }

      if (_.some(params, {'in': 'formData'})) {
        c.push('multipart/form-data');
      }

      if (consumes && _.isArray(consumes) && c.length) {
        consumes.forEach(function(mimeType) {
          c = _.without(c, mimeType);
        });
      }

      if (c.length) {
        endpoint.Consumes = c;
      }

      if (currentMethod.consumes && _.isArray(currentMethod.consumes)) {
        c = _.uniq((endpoint.Consumes && _.isArray(endpoint.Consumes)) ? endpoint.Consumes.concat(currentMethod.consumes):currentMethod.consumes);
        if (consumes && _.isArray(consumes) && c.length) {
          consumes.forEach(function(mimeType) {
            c = _.without(c, mimeType);
          });
        }
        if (endpoint.Consumes || c.length) {
          endpoint.Consumes = c;
        }
      }

      if (endpoint.Method.toLowerCase() !== 'get' &&
          endpoint.Method.toLowerCase() !== 'head') {
        let body = this._mapRequestBody(params, currentMethodResolved.parameters);

        if (body) {
          endpoint.Body = body;
        }
      }

      // this needs to happen before the mappings below, because param/response $refs will be removed after those mappings
      endpoint.traits = this._mapEndpointTraits(currentMethod.parameters, currentMethod.responses);

      //if path params are defined in this level
      //map path params
			let mapURIParams = this._mapURIParams(currentMethod.parameters, currentMethodResolved.parameters);
			let pathParams = {};
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
        let p = _.uniq((endpoint.Produces && _.isArray(endpoint.Produces)) ? endpoint.Produces.concat(currentMethod.produces):currentMethod.produces);
        if (produces && _.isArray(produces) && p.length) {
          produces.forEach(function(mimeType) {
            p = _.without(p, mimeType);
          });
        }
        if (endpoint.Produces || p.length) {
          endpoint.Produces = p;
        }
      }
      let responses = this._mapResponseBody(currentMethod.responses, true, currentMethodResolved.responses, this.$refs);

      if (responses) {
        endpoint.Responses = responses;
      }

      //map security
      if (currentMethod.security) {
        let securities = currentMethod.security;
        for (let securityIndex in securities) {
          if (!securities.hasOwnProperty(securityIndex)) continue;
          let keys = Object.keys(securities[securityIndex]);
          let securityName = keys[0];
          let scheme = _.get(this, ['data', 'securityDefinitions', securityName]);
          if (!scheme) {
            //definition error
            continue;
          }
          switch(scheme.type) {
            case 'apiKey':
            case 'basic':
              if (endpoint.SecuredBy.none) {
                endpoint.SecuredBy = {};
              }
              endpoint.SecuredBy[scheme.type] = true;
              break;
            case 'oauth2':
              if (endpoint.SecuredBy.none) {
                endpoint.SecuredBy = {};
              }
              endpoint.SecuredBy[scheme.type] = securities[securityIndex][securityName];
              break;
          }
        }
      }

      this.project.addEndpoint(endpoint);
    }
  }
};

Swagger.prototype._mapTraits = function(parameters, responses) {
  let traits = {},
      queryParams = {},
      headerParams = {},
			formDataParams = {},
			bodyParams = {},
      traitResponses = {};

  for (let k in parameters) {
    if (!parameters.hasOwnProperty(k)) continue;
    let param = parameters[k],
        parts = k.split(':'),
        name = k;

    if (parts[0] === 'trait') {
      name = parts[1];
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

  for (let r in responses) {
    if (!responses.hasOwnProperty(r)) continue;

    let response = responses[r];
    let resName = r;
    let resCode = 200;
    let resNameParts = r.split(':');

    // Support for StopLight Swagger traits
    if (resNameParts.length === 3 && resNameParts[0] === 'trait') {
      resName = resNameParts[1];
      resCode = resNameParts[2];
    }

    traitResponses[resName] = traitResponses[resName] || {};
    traitResponses[resName][resCode] = response;
  }

  for (let k in queryParams) {
    if (!queryParams.hasOwnProperty(k)) continue;
    let trait = traits[k] || {
      _id: k,
      name: k,
      request: {},
      responses: []
    };

    trait.request.queryString = this._mapQueryString(queryParams[k]);
    traits[k] = trait;
  }

  for (let k in headerParams) {
    if (!headerParams.hasOwnProperty(k)) continue;
    let trait = traits[k] || {
      _id: k,
      name: k,
      request: {},
      responses: []
    };

    trait.request.headers = this._mapRequestHeaders(headerParams[k]);
    traits[k] = trait;
  }
	
	for (let k in formDataParams) {
		if (!formDataParams.hasOwnProperty(k)) continue;
		let trait = traits[k] || {
				_id: k,
				name: k,
				request: {},
				responses: []
			};
		
		trait.request.formData = this._mapRequestBody(formDataParams[k]);
		traits[k] = trait;
	}
	
	for (let k in bodyParams) {
		if (!bodyParams.hasOwnProperty(k)) continue;
		let trait = traits[k] || {
				_id: k,
				name: k,
				request: {},
				responses: []
			};
		
		trait.request.body = this._mapRequestBody(bodyParams[k]);
		traits[k] = trait;
	}

  for (let k in traitResponses) {
    if (!traitResponses.hasOwnProperty(k)) continue;
    let trait = traits[k] || {
      _id: k,
      name: k,
      request: {},
      responses: []
    };
    trait.responses = this._mapResponseBody(traitResponses[k]);
    traits[k] = trait;
  }

  return _.values(traits);
};

Swagger.prototype._getExtensionsFrom = function(object) {
	let result = {};
	for (let key in object) {
		if (!object.hasOwnProperty(key)) continue;
		
		if (_.startsWith(key, 'x-')) result[key] = object[key];
	}
	return result;
};

Swagger.prototype._createExtensions = function () {
	this.project.extensions = this._getExtensionsFrom(this.data);

	if (this.data.info) {
		let infoExtensions = this._getExtensionsFrom(this.data.info);
		if (!_.isEmpty(infoExtensions)) {
			this.project.Environment.extensions = infoExtensions;
		}
	}
	
	if (this.data.info.contact) {
		let contactExtensions = this._getExtensionsFrom(this.data.info.contact);
		if (!_.isEmpty(contactExtensions)) {
			this.project.Environment.contactInfo.extensions = contactExtensions;
		}
	}
	
	if (this.data.info.license) {
		let licenseExtensions = this._getExtensionsFrom(this.data.info.license);
		if (!_.isEmpty(licenseExtensions)) {
			this.project.Environment.license.extensions = licenseExtensions;
		}
	}
	
	if (this.data.externalDocs) {
		let externalDocsExtensions = this._getExtensionsFrom(this.data.externalDocs);
		if (!_.isEmpty(externalDocsExtensions)) {
			this.project.Environment.ExternalDocs.extensions = externalDocsExtensions;
		}
	}
	
	if (this.data.paths) {
		let endpointExtensions = this._getExtensionsFrom(this.data.paths);
		if (!_.isEmpty(endpointExtensions)) {
			this.project.endpointExtensions = {};
			this.project.endpointExtensions = endpointExtensions;
		}
	}
};

Swagger.prototype._import = function() {
  this.project = new Project(this.data.info.title);
  this.project.Description = this.data.info.description || '';
	this.project.tags = this.data.tags;

  let protocol = 'http';
  if (this.data.schemes && this.data.schemes.length > 0) {
    this.project.Environment.Protocols = this.data.schemes;
    protocol = this.data.schemes[0];
  }

  this._mapEndpoints(this.data.consumes, this.data.produces);

  this.project.Environment.summary = this.data.info.description || '';
  this.project.Environment.BasePath = this.data.basePath || '';
  this.project.Environment.Host = this.data.host ? (protocol + '://' + this.data.host) : '';
  this.project.Environment.Version = this.data.info.version;

	if (this.data.externalDocs) {
		this.project.Environment.ExternalDocs = {
			description: this.data.externalDocs.description,
			url: this.data.externalDocs.url
		};
	}

	if (this.data.info.contact) {
		this.project.Environment.contactInfo = {};
		if (this.data.info.contact.name) {
			this.project.Environment.contactInfo.name = this.data.info.contact.name;
		}
		if (this.data.info.contact.url) {
			this.project.Environment.contactInfo.url = this.data.info.contact.url;
		}
		if (this.data.info.contact.email) {
			this.project.Environment.contactInfo.email = this.data.info.contact.email;
		}
	}

	if (this.data.info.termsOfService) {
		this.project.Environment.termsOfService = this.data.info.termsOfService;
	}

	if (this.data.info.license) {
		this.project.Environment.license = {};
		if (this.data.info.license.name) {
			this.project.Environment.license.name = this.data.info.license.name;
		}
		if (this.data.info.license.url) {
			this.project.Environment.license.url = this.data.info.license.url;
		}

	}

  if (this.data.produces) {
    //taking the first as default one
    this.project.Environment.Produces = this.data.produces;
  }

  if (this.data.consumes) {
    //taking the first as default one
    this.project.Environment.Consumes = this.data.consumes;
  }
  if (this.data.securityDefinitions) {
    this.project.Environment.SecuritySchemes = this._mapSecurityDefinitions(this.data.securityDefinitions);
  }

  this.project.traits = this._mapTraits(this.data.parameters, this.data.responses);

  let schemas = this._mapSchema(this.data.definitions);
  for(let i in schemas) {
    if (!schemas.hasOwnProperty(i)) continue;
    this.project.addSchema(schemas[i]);
  }
	
	this._createExtensions();
};

module.exports = Swagger;
