var Endpoint = require('../entities/endpoint'),
    Exporter = require('./exporter'),
    SwaggerParser = require('swagger-parser'),
    jsonHelper = require('../utils/json.js'),
    stringHelper = require('../utils/strings.js'),
    urlHelper = require('../utils/url'),
    SwaggerDefinition = require('../entities/swagger/definition'),
    swaggerHelper = require('../helpers/swagger'),
    _ = require('lodash'),
    url = require('url');

function Swagger() {
  this.metadata = null;
}

function mapExample(data, target) {
  if (!_.isEmpty(data.example)) {
    var example = jsonHelper.parse(data.example);
    if (!_.isEmpty(example)) {
      target.example = example;
    }
  }
}

Swagger.prototype = new Exporter();

Swagger.prototype._getResponseTypes = function(endpoint, defaultResponseType) {
  var defRespType = defaultResponseType || [],
      produces = endpoint.Produces || [];

  return produces.reduce(function(result, mimeType) {
    if (result.indexOf(mimeType) === -1 &&
        defRespType.indexOf(mimeType) === -1) {
      result.push(mimeType);
    }

    return result;
  }, []);
};

Swagger.prototype._getRequestTypes = function(endpoint, parameters, defaultRequestType) {
  var result = [],
      typesToInclude = ['multipart/form-data', 'application/x-www-form-urlencoded'],
      consumes = endpoint.Consumes || [],
      defReqType = defaultRequestType || [];

  for(var i in parameters) {
    if (parameters[i].type && parameters[i].type === 'file') {
      //consumes must have 'multipart/form-data' or 'application/x-www-form-urlencoded'
      typesToInclude.forEach(function(mimeType) {
        if (!result.length) {
          if (consumes.indexOf(mimeType) >= 0) {
            result.push(mimeType);
          } else if(defReqType.indexOf(mimeType) >= 0) {
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
    consumes.forEach(function(mimeType) {
      if (defReqType.indexOf(mimeType) === -1) {
        result.push(mimeType);
      }
    });
  }

  return _.uniq(result);
};

Swagger.prototype._validateParameters = function(parameters) {
  parameters = jsonHelper.orderByKeys(parameters, ['$ref', 'name', 'in', 'description', 'required', 'schema', 'type']);
  var validTypes = ['string', 'number', 'integer', 'boolean', 'array', 'file'], defaultType = 'string';
  for(var i in parameters) {
    if (parameters[i].in && parameters[i].in != 'body') {
      if (Array.isArray(parameters[i].type)) {
        if(parameters[i].type.length > 0) {
          parameters[i].type = parameters[i].type[0];
        } else {
          parameters[i].type = defaultType;
        }
      }
      if(validTypes.indexOf(parameters[i].type) < 0) {
        //type not valid
        parameters[i].type = defaultType;
      }
    }
  }
  return parameters;
};

Swagger.prototype._constructTags = function(endpoint, env) {
  var tags = endpoint.tags || [];

  var group = _.find(env.GroupsOrder.docs, function(g) {
    return _.find(g.items, ['_id', endpoint._id]);
  });

  if (group) {
    tags.push(group.name);
  }

  return _.uniq(tags);
};

Swagger.prototype._constructSwaggerMethod = function(endpoint, parameters, responses, env) {
  var consumes = this._getRequestTypes(endpoint, parameters, env.Consumes);
  var produces = this._getResponseTypes(endpoint, env.Produces);
  endpoint.SetOperationId(endpoint.operationId, endpoint.Method, endpoint.Path);

  var resultSwaggerMethod = {};

  if (!_.isEmpty(endpoint.operationId)) {
    resultSwaggerMethod.operationId = endpoint.operationId;
  }

  if (!_.isEmpty(endpoint.Name)) {
    resultSwaggerMethod.summary = endpoint.Name;
  }

  var tags = this._constructTags(endpoint, env);
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
};

Swagger.prototype._mapEndpointSecurity = function(securedByTypes, securityDefinitions) {
  var security = [];
  for (var type in securedByTypes) {
    var scheme = securityDefinitions[type];
    if (!scheme) {
      //definition error
      continue;
    }
    switch (type) {
      case 'basic':
        var result = {};
        if (scheme.name) {
          result[scheme.name] = [];
          security.push(result);
        }
        break;
      case 'apiKey':
        if (scheme.headers && scheme.headers.length > 0) {
          for(var i in scheme.headers) {
            var result = {};
            result[scheme.headers[i].name] = [];
            security.push(result);
          }
        }
        if (scheme.queryString && scheme.queryString.length > 0) {
          for(var i in scheme.queryString) {
            var result = {};
            result[scheme.queryString[i].name] = [];
            security.push(result);
          }
        }
        break;
      case 'oauth2':
        var result = {};
        result[type] = securedByTypes[type];
        security.push(result);
        break;
    }
  }
  return security;
};

Swagger.prototype._mapSecurityDefinitions = function(securityDefinitions) {
  var result = {};
  for(var type in securityDefinitions) {
    var sd = securityDefinitions[type];
    switch(type) {
      case 'apiKey':
        if (sd.hasOwnProperty('headers') && sd.headers.length > 0) {
          for(var i in sd.headers) {
            var header = sd.headers[i];
            result[header.name] = {
              name: header.name,
              type: type,
              in: 'header'
            };
          }
        }
        if (sd.hasOwnProperty('queryString') && sd.queryString.length > 0) {
          for(var i in sd.queryString) {
            var header = sd.queryString[i];
            result[header.name] = {
              name: header.name,
              type: type,
              in: 'query'
            };
          }
        }
        break;
      case 'oauth2':

        var slScopes = sd.scopes, swaggerScopes = {};
        for (var i in slScopes) {
          var scope = slScopes[i];
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
      case 'basic':
        if (sd.name) {
          result[sd.name] = {
            type: type
          };

          if (!_.isEmpty(sd.description)) {
            result[sd.name].description = sd.description;
          }
        }
        break;
    }
  }
  return result;
};


Swagger.prototype._mapURIParams = function(pathParams) {
  var parameters = [];
  if (!pathParams.properties || _.isEmpty(pathParams)) {
    return parameters;
  }

  for (var paramName in pathParams.properties) {
    var prop = pathParams.properties[paramName];
    var param = swaggerHelper.setParameterFields(prop, {});
    param.name = paramName;
    param.in = 'path';
    param.required = true;
    param.type = param.type || 'string';
    if (!_.isEmpty(prop.description)) {
      param.description = prop.description;
    }
		this._addPatternedObjects(prop, param);
    parameters.push(param);
  }
  return parameters;
};

Swagger.prototype._mapQueryString = function(queryStringParams) {
  var parameters = [];
  if (!queryStringParams.properties) {
    return parameters;
  }
  for (var paramName in queryStringParams.properties) {
    var param = swaggerHelper.setParameterFields(queryStringParams.properties[paramName], {});
    param.name = paramName;
    param.in = 'query';
    param.required = (queryStringParams.required &&
        queryStringParams.required.indexOf(param.name) >= 0);
    parameters.push(param);
  }
  return parameters;
};

function mapResponseBody(res, mimeType) {
  var item = {};

  item.description = res.description || '';

  // if response body mimeType is null, do not include schema in swagger export
  // TODO: Figure out how to set example for mimeType properly.
  // if (!mimeType) {
  //   return item;
  // }

  var body = jsonHelper.parse(res.body);
  if (body && !_.isEmpty(body)) {
    item.schema = convertRefFromModel(body);
  }

  if (mimeType && mimeType !== '' && res.example && res.example !== '{}' && res.example.length > 2) {
    item.examples = {};
    item.examples[mimeType] = jsonHelper.parse(res.example);
  }

  return item;
}

Swagger.prototype._mapResponseBody = function(endpoint, env) {
  var slResponses = endpoint.Responses;

  var result = {};
  for(var i in slResponses) {
    var res = slResponses[i];
    var mimeType = (endpoint.Produces && endpoint.Produces.length) ? endpoint.Produces[0]:null;
    // if (!mimeType && env.Produces && env.Produces.length) {
    //   mimeType = env.Produces[0];
    // }
    var item = mapResponseBody(res, mimeType);
    result[(res.codes && res.codes.length > 0 && parseInt(res.codes[0]) ? res.codes[0] : 'default')] = item;
  }

  return result;
};

Swagger.prototype._mapRequestBody = function(slRequestBody, requestTypes) {
  if (_.isEmpty(slRequestBody.body)) {
    return [];
  }
  var result = [], body = jsonHelper.parse(slRequestBody.body) || {};

  var param = {};
  if (!_.isEmpty(slRequestBody.description)) {
    param.description = slRequestBody.description;
  }

  if (!jsonHelper.isEmptySchema(body)) {
    //make sure body isn't empty
    var regex = /\"type\":[ ]*\"file\"|\"type\":[ ]*\"binary\"/;
    //export as formData only if schema includes file type property
    if (slRequestBody.body.match(regex) ||
      (!_.isEmpty(requestTypes) && ['multipart/form-data', 'application/x-www-form-urlencoded'].indexOf(requestTypes[0]) !== -1)) {
      for (var prop in body.properties) {
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

      mapExample(slRequestBody, body);

      param.name = 'body';
      param.in = 'body';
      param.schema = convertRefFromModel(body);

      result.push(param);
    }
  }

  return result;
};

Swagger.prototype._mapRequestHeaders = function(slHeaders) {
  var result = [];

  if (slHeaders) {
    for(var property in slHeaders.properties) {
      var param = swaggerHelper.setParameterFields(slHeaders.properties[property], {});
      param.name = property;
      param.in = 'header';
      param.required = slHeaders.required && (slHeaders.required.indexOf(property) >= 0);

      var desc = slHeaders.properties[property].description;
      if (!_.isEmpty(desc)) {
        param.description = slHeaders.properties[property].description;
      }

      result.push(param);
    }
  }

  return result;
};

Swagger.prototype._mapSchema = function(slSchemas) {
  var result = {};
  for (var i in slSchemas) {
    var schema = slSchemas[i];
    var definition = convertRefFromModel(jsonHelper.parse(schema.Definition));
    mapExample(schema, definition);
    result[schema.NameSpace] = definition;
  }
  return result;
};

// from ref=type1 to $ref=#/definitions/type1
function convertRefFromModel(object) {
  for (var id in object) {
    if (object.hasOwnProperty(id)) {
      var val = object[id];
  	  if (id == 'allOf') {
  		  object.allOf = val.map(function(obj) {
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
        object[id] = convertRefFromModel(val);
      }
    }
  }

  return object;
}

Swagger.prototype._mapEndpointTraitParameters = function (endpoint, existingParams) {
  if (!endpoint.traits || !endpoint.traits.length) {
    return [];
  }

  var params = [];

  for (var i in endpoint.traits) {
    var trait = _.find(this.project.Traits, ['_id', endpoint.traits[i]]);

    if (!trait) {
      continue;
    }

    try {
      var schema = jsonHelper.parse(trait.request.queryString);
      for (var p in schema.properties) {
        // only add it if we didn't already explicitly define it in the operation
        if (!_.find(existingParams, {name: p, in: 'query'})) {
          params.push({
            $ref: '#/parameters/' + stringHelper.computeTraitName(trait.name, p)
          });
        }
      }
    } catch (e) {}

    try {
      var schema = jsonHelper.parse(trait.request.headers);
      for (var p in schema.properties) {
        // only add it if we didn't already explicitly define it in the operation
        if (!_.find(existingParams, {name: p, in: 'header'})) {
          params.push({
            $ref: '#/parameters/' + stringHelper.computeTraitName(trait.name, p)
          });
        }
      }
    } catch (e) {}
  }

  return params;
};

Swagger.prototype._mapEndpointTraitResponses = function (endpoint) {
  if (!endpoint.traits || !endpoint.traits.length) {
    return [];
  }

  var result = {};
  for (var i in endpoint.traits) {
    var trait = _.find(this.project.Traits, ['_id', endpoint.traits[i]]);
    if (!trait) {
      continue;
    }

    for(var i in trait.responses) {
      var res = trait.responses[i],
          code = (res.codes && res.codes.length > 0 && parseInt(res.codes[0]) ? res.codes[0] : 'default');

      result[code] = {
        $ref: '#/responses/' + stringHelper.computeTraitName(trait.name, code)
      };
    }
  }

  return result;
};

Swagger.prototype._mapEndpoints = function (swaggerDef, env) {
  var endpoints = this.project.Endpoints;

  // Collect endpoints ids from environment resourcesOrder
  var orderedIds = env.resourcesOrder.docs.reduce(function(ids, group) {
    return ids.concat(_.map(_.filter(group.items, {type: 'endpoints'}), '_id'));
  }, []);

  // Sort endpoints similar to resourcesOrder items order
  endpoints.sort(function (a, b) {
    return orderedIds.indexOf(a._id) < orderedIds.indexOf(b._id) ? -1 : 1;
  });

  for(var i in endpoints) {
    var endpoint = endpoints[i], parameters = [];
    var requestTypes = this._getRequestTypes(endpoint, parameters, env.Consumes);
    // To build parameters we need to grab data from body for supported mimeTypes
    requestTypes = _.isEmpty(requestTypes) ? env.Consumes : requestTypes;

    if (!swaggerDef.paths[endpoint.Path]) {
      var params = this._validateParameters(this._mapURIParams(endpoint.PathParams));
      swaggerDef.paths[endpoint.Path] = params.length ? {parameters: params} : {};
    }

    parameters = parameters.concat(this._mapQueryString(endpoint.QueryString));
    parameters = parameters.concat(this._mapRequestBody(endpoint.Body, requestTypes));

    parameters = parameters.concat(this._mapRequestHeaders(endpoint.Headers));
    parameters = parameters.concat(this._mapEndpointTraitParameters(endpoint, parameters));
    parameters = this._validateParameters(parameters);

    var responses = _.assign({}, this._mapEndpointTraitResponses(endpoint), this._mapResponseBody(endpoint, env));
    if (_.isEmpty(responses)) {
      // empty schema for swagger spec validation
      responses['default'] = {
        description: '',
        schema: {}
      };
    }

    // if (_.isEmpty(endpoint.Produces)) {
    //   for (var statusCode in responses) {
    //     var response = responses[statusCode];
    //     delete response.schema;
    //   }
    // }

    swaggerDef.paths[endpoint.Path][endpoint.Method] = this._constructSwaggerMethod(endpoint, parameters, responses, env);
    //Is it OK to include produces/consumes in all cases?

    var security = [];
    if (endpoint.SecuredBy) {
      var security = this._mapEndpointSecurity(endpoint.SecuredBy, this.project.Environment.SecuritySchemes);
      if (!_.isEmpty(security)) {
        swaggerDef.paths[endpoint.Path][endpoint.Method]['security'] = security;
      }
    }
	
		this._addPatternedObjects(endpoint, swaggerDef.paths[endpoint.Path][endpoint.Method]);
  }
};

Swagger.prototype._addPatternedObjects = function(source, target) {
	for (var key in source) {
		if (!source.hasOwnProperty(key)) continue;
		var value = source[key];
		if (_.startsWith(key, 'x-')) {
			target[key] = value;
		}
	}
};

Swagger.prototype._mapTraitParameters = function (traits) {
  var parameters = {};

  for (var i in traits) {
    var trait = traits[i],
        params = [];

    try {
      var schema = jsonHelper.parse(trait.request.queryString);
      if (!jsonHelper.isEmptySchema(schema)) {
        params = params.concat(this._validateParameters(this._mapQueryString(schema)));
      }
    } catch(e) {}

    try {
      var schema = jsonHelper.parse(trait.request.headers);
      if (!jsonHelper.isEmptySchema(schema)) {
        params = params.concat(this._validateParameters(this._mapRequestHeaders(schema)));
      }
    } catch(e) {}

    for (var p in params) {
      var param = params[p];
      parameters[stringHelper.computeTraitName(trait.name, param.name)] = param;
    }
  }

  return parameters;
};

Swagger.prototype._mapTraitResponses = function (traits) {
  var responses = {};

  for (var i in traits) {
    var trait = traits[i];
    for(var i in trait.responses) {
      var res = trait.responses[i],
          item = mapResponseBody(res),
          responseName = stringHelper.computeTraitName(trait.name, (res.codes && res.codes.length > 0 && parseInt(res.codes[0]) ? res.codes[0] : 'default'));

      responses[responseName] = item;
    }
  }

  return responses;
};

Swagger.prototype._mapHostAndProtocol = function (env, swaggerDef) {
  var acceptedSchemes = ['http', 'https', 'ws', 'wss'];
  var hostUrl = url.parse(env.Host || '');
  var swaggerHost = hostUrl.hostname || '';
  if (swaggerHost && hostUrl.port) {
    swaggerHost = swaggerHost + ':' + hostUrl.port;
  }
  swaggerDef.Host = swaggerHost;

  // If host has path on it, prepend to base path
  swaggerDef.BasePath = env.BasePath;
  if (hostUrl.path && hostUrl.path !== '/') {
    swaggerDef.BasePath = urlHelper.join(hostUrl.path, env.BasePath);
  }

  if (this._isTemplateUri(swaggerDef.basePath)) {
		this._convertToTemplateUri(swaggerDef);
	}

  if(Array.isArray(env.Protocols) && !_.isEmpty(env.Protocols)) {
    var filteredSchemes = [];
    env.Protocols.map(function(p){
      if (acceptedSchemes.indexOf(p.toLowerCase()) >= 0) {
        filteredSchemes.push(p.toLowerCase());
      }
    });
    swaggerDef.schemes = filteredSchemes;
  } else if(hostUrl.protocol) {
    swaggerDef.schemes = [hostUrl.protocol.split(':')[0]];
  } else {
    delete swaggerDef.schemes;
  }
};

Swagger.prototype._isTemplateUri = function (uri) {
	var decodeUri = decodeURI(uri);
	return decodeUri.indexOf('{') !== -1 || decodeUri.indexOf('}') !== -1;
};

Swagger.prototype._convertToTemplateUri = function (swaggerDef) {
	swaggerDef['x-basePath'] = decodeURI(swaggerDef.basePath);
	delete swaggerDef.basePath;
};

Swagger.prototype._export = function () {
  //TODO
  var swaggerDef = new SwaggerDefinition(this.project.Name, this.project.Description);
  var env = this.project.Environment;
  swaggerDef.info.version = env.Version;
  swaggerDef.BasePath = env.BasePath || '';

  this._mapHostAndProtocol(env, swaggerDef);

  if(env.Produces && env.Produces.length > 0) {
    swaggerDef.produces = env.Produces;
  } else {
    delete swaggerDef.produces;
  }

  if(env.Consumes && env.Consumes.length > 0) {
    swaggerDef.consumes = env.Consumes;
  } else {
    delete swaggerDef.consumes;
  }

  swaggerDef.definitions = this._mapSchema(this.project.Schemas);

  var parameters = this._mapTraitParameters(this.project.Traits);
  if (!_.isEmpty(parameters)) {
    swaggerDef.parameters = parameters;
  } else {
    delete swaggerDef.parameters;
  }

  var responses = this._mapTraitResponses(this.project.Traits);
  if (!_.isEmpty(responses)) {
    swaggerDef.responses = responses;
  } else {
    delete swaggerDef.responses;
  }

  swaggerDef.securityDefinitions = this._mapSecurityDefinitions(this.project.Environment.SecuritySchemes);

  this._mapEndpoints(swaggerDef, env);

  //if not security definition added, then don't keep the field anymore
  if (swaggerDef.securityDefinitions && _.isEmpty(swaggerDef.securityDefinitions)) {
    delete swaggerDef.securityDefinitions;
  }
  this.data = jsonHelper.toJSON(swaggerDef);
};

module.exports = Swagger;
