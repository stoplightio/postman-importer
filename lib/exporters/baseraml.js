var _ = require('lodash'),
    Exporter = require('./exporter'),
    ramlHelper = require('../helpers/raml'),
    jsonHelper = require('../utils/json'),
    YAML = require('js-yaml');

function RAMLDefinition(title, env) {
  this.title = title;
  //TODO anyway to know version?
  this.version = env.Version;
  this.baseUri = env.Host + env.BasePath;
  this.mediaType = env.DefaultResponseType || '';
  this.protocols = mapProtocols(env.Protocols);
}

RAMLDefinition.prototype.addMethod = function(resource, methodURIs, methodKey, method) {
  if (!methodURIs) {
    return;
  }

  if (methodURIs.length <= 0) {
    //reach the leaf of tree
    //TODO optional: check same method existence
    if (!resource.uriParameters) {
      resource.uriParameters = {};
    }
    for (var attrname in method.uriParameters) {
      if (!method.uriParameters.hasOwnProperty(attrname)) continue;
      //uri not available, so check with displayName, which is same
      var isURIParamExist = resource.displayName.split(attrname).length - 1;
      if (isURIParamExist) {
        resource.uriParameters[attrname] = method.uriParameters[attrname];
      }
    }

    delete method.uriParameters;
    if (Object.keys(resource.uriParameters).length == 0) delete resource.uriParameters;

    resource[methodKey] = method;
  }
  else {
    var currentURI = '/' + methodURIs[0];
    if (!resource[currentURI]) {
      resource[currentURI] = {
        displayName: methodURIs[0]
      };
      //TODO uriParams?!?
    }
    methodURIs.splice(0, 1);
    this.addMethod(resource[currentURI], methodURIs, methodKey, method);
  }
};

function RAML() {
  this.metadata = null;
	this.hasTags = false;
	this.hasDeprecated = false;
	this.hasExternalDocs = false;
	this.hasInfo = false;
}

RAML.prototype = new Exporter();

RAML.prototype._mapSecurityScheme = function(slSecuritySchemes) {
  var ramlSecuritySchemes = {};

  if (slSecuritySchemes.hasOwnProperty('oauth2')) {
    var name = slSecuritySchemes.oauth2.name || 'oauth2';
    //missing describedBy, description

    ramlSecuritySchemes[name] = {
      type: 'OAuth 2.0',
      settings: {
        authorizationUri: slSecuritySchemes.oauth2.authorizationUrl || undefined,
        accessTokenUri: slSecuritySchemes.oauth2.tokenUrl || '',
        authorizationGrants: this.mapAuthorizationGrants(slSecuritySchemes.oauth2.flow)
      }
    };
	
		var scopes = [];
		if (slSecuritySchemes.oauth2.scopes && !_.isEmpty(slSecuritySchemes.oauth2.scopes)) {
			for (var index in slSecuritySchemes.oauth2.scopes) {
				var scope = slSecuritySchemes.oauth2.scopes[index].name;
				scopes.push(scope);
			}
			
			ramlSecuritySchemes[name]['settings']['scopes'] = scopes;
		}
	}

  if (slSecuritySchemes.hasOwnProperty('basic')) {
    var basicName = slSecuritySchemes.basic.name;
    if (basicName) {
      ramlSecuritySchemes[basicName] = {
        type: 'Basic Authentication',
        description: slSecuritySchemes.basic.description
      };
    }
  }
  
  if (slSecuritySchemes.hasOwnProperty('apiKey')) {
		var externalName = null;
		var content = null;
		var description = null;
		if (slSecuritySchemes.apiKey.headers && !_.isEmpty(slSecuritySchemes.apiKey.headers)) {
			externalName = slSecuritySchemes.apiKey.headers[0].externalName;
			var keyName = slSecuritySchemes.apiKey.headers[0].name;
			description = slSecuritySchemes.apiKey.headers[0].description;
			content = {
				headers: {}
			};
			content['headers'][keyName] = {
			  type: 'string'
			};
		} else if (slSecuritySchemes.apiKey.queryString) {
		}
		
		ramlSecuritySchemes[externalName] = {
			type: 'Pass Through',
			describedBy: content,
			description: description
		};
	
	}

  return ramlSecuritySchemes;
};

RAML.prototype._validateParam = function(params) {
  var acceptedTypes = ['string', 'number', 'integer', 'date', 'boolean', 'file', 'array'];
  for(var key in params) {
    if (!params.hasOwnProperty(key)) continue;
    var param = params[key];
    for (var prop in param) {
      if (!param.hasOwnProperty(prop)) continue;
      switch (prop) {
        case 'type':
          var type = params[key].type;
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
          var typeLowercase = params[key].type.toLowerCase();
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

RAML.prototype._mapRequestBody = function(bodyData){
  var body = {};
  if (bodyData.body) {
    var mimeType = bodyData.mimeType;

    if (!mimeType) {
      return body;
    }

    switch(mimeType) {
      case 'application/json':
        body[mimeType] = this.mapBody(bodyData);
        break;
      case 'multipart/form-data':
      case 'application/x-www-form-urlencoded':
        var parsedBody = jsonHelper.parse(bodyData.body);
        body[mimeType] = this.mapRequestBodyForm(parsedBody);
        break;
      default:
        //unsuported format
        //TODO
    }

    if (bodyData.description) {
        body[mimeType].description = bodyData.description;
    }
  }
  return body;
};

RAML.prototype._mapNamedParams = function(params){
  if (Object.keys(params.properties).length == 0) return;

  var newParams = {};
  for(var key in params.properties) {
    if (!params.properties.hasOwnProperty(key)) continue;
    newParams[key] = ramlHelper.setParameterFields(params.properties[key], {});
    if(params.required && params.required.indexOf(key) > -1){
      newParams[key].required = true;
    }
    newParams[key] = jsonHelper.orderByKeys(newParams[key], ['type', 'description']);
  }
  return this._validateParam(newParams);
};

RAML.prototype._mapResponseBody = function(responseData){
  var responses = {};

  for(var i in responseData) {
    if (!responseData.hasOwnProperty(i)) continue;
    var resBody = responseData[i];
    if (!_.isEmpty(resBody.codes)) {
      var code = resBody.codes[0];
      if (code === 'default' || parseInt(code) == 'NaN') {
        continue;
      }

      responses[code] = {
        body: {}
      };

      var type = resBody.mimeType;

      if (resBody.mimeType) {
        responses[code]['body'][type] = this.mapBody(resBody);
      } else {
        responses[code] = {};
      }

      if (resBody.description) {
        responses[code]['description'] = resBody.description;
      }

      if (!jsonHelper.isEmptySchema(resBody.headers)) {
        responses[code]['body'][type].headers = this._mapNamedParams(resBody.headers);
      }
    }
  }
  return responses;
};

//TODO: Stoplight doesn't support seperate path params completely yet
RAML.prototype._mapURIParams = function(pathParamData) {
  if(!pathParamData.properties || Object.keys(pathParamData.properties).length == 0) {
    return;
  }

  var pathParams = {};
  for(var key in pathParamData.properties) {
    if (!pathParamData.properties.hasOwnProperty(key)) continue;
    var prop = pathParamData.properties[key];

    pathParams[key] = ramlHelper.setParameterFields(prop, {});
    if(prop.description) {
      pathParams[key].displayName = prop.description;
    }
    if(prop.items) {
      pathParams[key].items = prop.items;
    }

    pathParams[key].type = pathParams[key].type || 'string';
  }

  return this._validateParam(pathParams);
};

function mapProtocols(protocols) {
  var validProtocols = [];
  for(var i in protocols) {
    if (!protocols.hasOwnProperty(i) || ((protocols[i].toLowerCase() != 'http') && (protocols[i].toLowerCase() != 'https'))) {
      //RAML incompatible formats( 'ws' etc)
      continue;
    }
    validProtocols.push(protocols[i].toUpperCase());
  }
  return validProtocols;
}

RAML.prototype._mapTextSections = function(slTexts) {
  var results = [];
  for (var i in slTexts) {
    if (!slTexts.hasOwnProperty(i)) continue;
    var text = slTexts[i];

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
RAML.prototype.convertRefFromModel = function(object) {
  for (var id in object) {
    if (object.hasOwnProperty(id)) {
      var val = object[id];
      if (id == 'ref') {
        object.type = val;
        delete object[id];
      }
      else if (id == 'include') {
        object.type = '!include ' + val;
        delete object[id];
      }
      else if ((typeof val) === 'object') {
				if (val.type == 'string') {
					if (val.format == 'byte' || val.format == 'binary' || val.format == 'password') {
						object[id] =  {
							type: 'string'
						};
					}
					if (val.format == 'date') {
						object[id] =  {
							type: 'date-only'
						};
					} else if (val.format == 'date-time') {
						object[id] =  {
							type: 'datetime',
							format: 'rfc3339'
						};
					}
				} else {
					object[id] = this.convertRefFromModel(val);
				}
      }
    }
  }

  return object;
};

RAML.prototype._mapTraits = function(slTraits) {
  var traits = [];

  for (var i in slTraits) {
    if (!slTraits.hasOwnProperty(i)) continue;
    var slTrait = slTraits[i],
        trait = {};

    try {
      var queryString = JSON.parse(slTrait.request.queryString);
      if (!jsonHelper.isEmptySchema(queryString)) {
        trait.queryParameters = this._mapNamedParams(queryString);
      }
    } catch(e) {}

    try {
      var headers = JSON.parse(slTrait.request.headers);
      if (!jsonHelper.isEmptySchema(headers)) {
        trait.headers = this._mapNamedParams(headers);
      }
    } catch(e) {}

    try {
      if (slTrait.responses && slTrait.responses.length) {
        trait.responses = this._mapResponseBody(slTrait.responses);
      }
    } catch(e) {}

    var newTrait = {};
    newTrait[_.camelCase(slTrait.name)] = trait;
    traits.push(newTrait);
  }

  return traits;
};

RAML.prototype._mapEndpointTraits = function(slTraits, endpoint) {
  var is = [];

  for (var i in endpoint.traits) {
    if (!endpoint.traits.hasOwnProperty(i)) continue;
    var trait = _.find(slTraits, ['_id', endpoint.traits[i]]);
    if (!trait) {
      continue;
    }
    is.push(_.camelCase(trait.name));
  }

  return is;
};

RAML.prototype._export = function () {
  var env = this.project.Environment;
  var ramlDef = new RAMLDefinition(this.project.Name, env);
	
	this.description(ramlDef, this.project);

	if (this.project.Environment.ExternalDocs) {
		this.hasExternalDocs = true;
		ramlDef['(externalDocs)'] = {
			'description': this.project.Environment.ExternalDocs.description,
			'url': this.project.Environment.ExternalDocs.url
		};
	}
	
	if (this.project.Environment.contactInfo || this.project.Environment.termsOfService || this.project.Environment.license) {
		ramlDef['(info)'] = {};
		this.hasInfo = true;
	}
	
	if (this.project.Environment.contactInfo) {
		ramlDef['(info)'].contact = {};
		if (this.project.Environment.contactInfo.name) {
			ramlDef['(info)'].contact.name = this.project.Environment.contactInfo.name;
		}
		if (this.project.Environment.contactInfo.url) {
			ramlDef['(info)'].contact.url = this.project.Environment.contactInfo.url;
		}
		if (this.project.Environment.contactInfo.email) {
			ramlDef['(info)'].contact.email = this.project.Environment.contactInfo.email;
		}
	}
	
	if (this.project.Environment.termsOfService) {
		ramlDef['(info)'].termsOfService = this.project.Environment.termsOfService;
	}
	
	if (this.project.Environment.license) {
		ramlDef['(info)'].license = {};
		if (this.project.Environment.license.name) {
			ramlDef['(info)'].license.name = this.project.Environment.license.name;
		}
		if (this.project.Environment.license.url) {
			ramlDef['(info)'].license.url = this.project.Environment.license.url;
		}
	}
	
	var docs = this._mapTextSections(this.project.Texts);
  if (docs.length) {
    ramlDef.documentation = ramlDef.documentation.concat(docs);
  }

  var slSecuritySchemes = this.project.Environment.SecuritySchemes;
  var securitySchemes = this._mapSecurityScheme(slSecuritySchemes);

  if (!_.isEmpty(securitySchemes)) {
    ramlDef.securitySchemes = securitySchemes;
  }

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
    if (!endpoints.hasOwnProperty(i)) continue;
    var endpoint = endpoints[i];

    var method = {};
    if (endpoint.operationId || endpoint.Name) {
      method.displayName = endpoint.operationId || endpoint.Name;
    }
    if (endpoint.Description) {
      method.description = endpoint.Description;
    }
    if (endpoint.Summary) {
      method.description = endpoint.Summary + '. ' + method.description;
    }

    var is = this._mapEndpointTraits(this.project.Traits, endpoint);
    if (is.length) {
      method.is = is;
    }

    if (endpoint.Method.toLowerCase() === 'post' ||
        endpoint.Method.toLowerCase() === 'put' ||
        endpoint.Method.toLowerCase() === 'patch') {
      method.body = this._mapRequestBody(endpoint.Body);
    }

    method.headers = this._mapNamedParams(endpoint.Headers);

    method.responses = this._mapResponseBody(endpoint.Responses);

    method.queryParameters = this._mapURIParams(endpoint.QueryString);

    method.uriParameters = this._mapURIParams(endpoint.PathParams);

    if (endpoint.securedBy) {
      var rsecuredBy = [];
      if (endpoint.securedBy.oauth2) {
				var securedName = slSecuritySchemes.oauth2.name || 'oauth2';
				if (!_.isEmpty(endpoint.securedBy.oauth2)) {
					var scopes = {};
					scopes[securedName] = {
						scopes : endpoint.securedBy.oauth2
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

    var uriParts = endpoint.Path.split('/');
    uriParts.splice(0, 1);
    ramlDef.addMethod(ramlDef, uriParts, endpoint.Method, method);
		
		if (endpoint.Tags && !_.isEmpty(endpoint.Tags)) {
			this.hasTags = true;
			method['(tags)'] = endpoint.Tags;
		}
	
		if (endpoint.Deprecated) {
			this.hasDeprecated = true;
			method['(deprecated)'] = endpoint.Deprecated;
		}
		
		if (endpoint.ExternalDocs) {
			this.hasExternalDocs = true;
			method['(externalDocs)'] = {
				'description': endpoint.ExternalDocs.description,
				'url': endpoint.ExternalDocs.url
			};
		}
  }

	if (this.hasTags || this.hasDeprecated || this.hasExternalDocs) {
		ramlDef.annotationTypes = {};
		if (this.hasTags) {
			ramlDef.annotationTypes.tags = 'string[]';
		}
		
		if (this.hasDeprecated) {
			ramlDef.annotationTypes.deprecated = 'boolean';
		}
		
		if (this.hasExternalDocs) {
			ramlDef.annotationTypes.externalDocs = {
			  properties: {
				  'description': 'string',
				  'url': 'string'
			  }
			};
		}
		
		if (this.hasInfo) {
			ramlDef.annotationTypes.info = {
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
				}
			};
		}
	}

  if (this.project.Schemas && this.project.Schemas.length > 0)
    this.addSchema(ramlDef, this.mapSchema(this.project.Schemas));

  if (this.project.Traits && this.project.Traits.length > 0)
    ramlDef.traits = this._mapTraits(this.project.Traits);

  // Clean empty field in definition
  for (var field in ramlDef) {
    if (ramlDef.hasOwnProperty(field) && !ramlDef[field]) {
      delete ramlDef[field];
    }
  }

  this.data = ramlDef;
};

RAML.prototype._unescapeYamlIncludes = function(yaml) {
  var start = yaml.indexOf("'!include ");
  if (start == -1) return yaml;
  var end = yaml.indexOf("'", start+1);
  if (end == -1) return yaml;
  return yaml.substring(0, start) + yaml.substring(start+1, end) + this._unescapeYamlIncludes(yaml.substring(end+1));
};

RAML.prototype._getData = function(format) {
  switch (format) {
    case 'yaml':
      var yaml = this._unescapeYamlIncludes(YAML.dump(JSON.parse(JSON.stringify(this.Data)), {lineWidth: -1}));
      return '#%RAML ' + this.version() + '\n'+yaml;
    default:
      throw Error('RAML doesn not support '+format+' format');
  }
};

RAML.prototype.description = function(ramlDef, project) { throw new Error('description method not implemented'); };

RAML.prototype.version = function() { throw new Error('version method not implemented'); };

RAML.prototype.mapAuthorizationGrants = function(flow) { throw new Error('mapAuthorizationGrants method not implemented');  };

RAML.prototype.mapBody = function(bodyData) { throw new Error('mapBody method not implemented'); };

RAML.prototype.mapRequestBodyForm = function(bodyData) { throw new Error('mapRequestBodyForm method not implemented'); };

RAML.prototype.addSchema = function(ramlDef, schema) { throw new Error('addSchema method not implemented'); };

RAML.prototype.mapSchema = function(schema) { throw new Error('mapSchema method not implemented'); };

module.exports = RAML;
