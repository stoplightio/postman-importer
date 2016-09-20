var parser = require('raml-1-parser'),
    Endpoint = require('../entities/endpoint'),
    Importer = require('./importer'),
    Project = require('../entities/project'),
    jsonHelper = require('../utils/json'),
    ramlHelper = require('../helpers/raml'),
    url = require('url'),
    _ = require('lodash');

//TODO multi file support isn't justified

function RAML() {
  this.schemas = [];
}
RAML.prototype = new Importer();

RAML.prototype._getSecuritySchemeSettingsByName = function(schemeName) {
  var securitySchemes = this.data.securitySchemes();
  for(var i in securitySchemes) {
    if (schemeName === securitySchemes[i].name()) {
      return securitySchemes[i];
    }
  }
};

RAML.prototype._mapSecuritySchemes = function (securitySchemes) {
  var slSecurityScheme = {};
  for(var i in securitySchemes) {
    if (!securitySchemes.hasOwnProperty(i)) continue;
    var securityScheme = securitySchemes[i];
    for (var name in securityScheme) {
      if (!securityScheme.hasOwnProperty(name)) continue;
      var scheme = securityScheme[name];
      switch(scheme.type) {
        case 'OAuth 2.0':
          var oauth = {
            name: name, //not used in stoplight designer
            authorizationUrl: scheme.settings.authorizationUri || '',
            tokenUrl: scheme.settings.accessTokenUri || '',
            scopes: []
          };
          if (Array.isArray(scheme.scopes)) {
            for(var scopeIndex in scheme.scopes) {
              if (!scheme.scopes.hasOwnProperty(scopeIndex)) continue;
              oauth.scopes.push({
                name: scheme.scopes[scopeIndex],
                value: ''
              });
            }
          }
          //authorizationGrants are flow, only one supported in stoplight
          var flow = !_.isEmpty(scheme.settings.authorizationGrants) ? scheme.settings.authorizationGrants[0]:'code';

          switch(flow) {
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

RAML.prototype._mapRequestBody = function (methodBody) {
  return this.mapRequestBody(methodBody);
};

RAML.prototype._mapQueryString = function(queryParameters) {
  var queryString = {type:'object', properties: {}, required: []};
  for (var key in queryParameters) {
    if (!queryParameters.hasOwnProperty(key)) continue;
    var qp = queryParameters[key];
    queryString.properties[key] = ramlHelper.setParameterFields(qp, {});
    if (qp.required()) {
      queryString.required.push(key);
    }
  }
  return queryString;
};

RAML.prototype._mapRequestHeaders = function (data) {
  return this._mapQueryString(data);
};

RAML.prototype._mapURIParams = function (uriParams) {
  var pathParams = {type:'object', properties: {}, required: []};

  for (var i in uriParams) {
    if (!uriParams.hasOwnProperty(i)) continue;
    var key = uriParams[i];

    pathParams.properties[key.name()] = {
      description: key.displayName() || key.description() || '',
      type: key.type() || 'string'
    };
  }
  return pathParams;
};

RAML.prototype._mapResponseBody = function(responses) {
  var data = [];
  for(var code in responses) {
    if (!responses.hasOwnProperty(code)) continue;
    var response = responses[code];

    if (!response || !response.body || !response.body()) {
      continue;
    }

    var result = this._mapRequestBody(response.body());
    result.codes = [response.code().value()];
    if (result.body) {
      result.body = jsonHelper.cleanSchema(result.body);
    }

    if (result.example) {
      result.example = jsonHelper.stringify(result.example, 4);
    }

    if(response.description() && response.description().value) {
      result.description = response.description().value();
    }
    data.push(result);
  }
  return data;
};

RAML.prototype._mapSchema = function(schemData) {
  return this.mapSchema(schemData);
};

// from type=type1 to ref=type1
RAML.prototype.convertRefToModel = function(object) {
  for (var id in object) {
    if (object.hasOwnProperty(id)) {
      var val = object[id];
      if (id == 'type' && typeof val === 'string' && ramlHelper.getScalarTypes.indexOf(val) < 0 && val !== 'object') {
        object.ref = val;
        delete object[id];
      } else if (typeof val === 'object') {
				if (val.type == 'date-only') {
					object[id] = {
						type: 'string',
						format: 'date'
					};
				} else if (val.type == 'datetime') {
					object[id] = {
						type: 'string',
						format: 'date-time'
					};
				}
				else {
        	object[id] = this.convertRefToModel(val);
				}
      }
    }
  }

  return object;
};

RAML.prototype._mapEndpoint = function(resource, baseURI, pathParams) {
  if(resource.uriParameters().length > 0) {
    pathParams = _.merge(pathParams, this._mapURIParams(resource.uriParameters()));
  }

  var methods = resource.methods();
  for (var i in methods) {
    if (!methods.hasOwnProperty(i)) continue;
    var method = methods[i];

    var summary = method.name ? method.name() : ''; // do we ever have a name or summary?
    var endpoint = new Endpoint(summary);
    endpoint.Method = method.method();
    endpoint.Path = baseURI + resource.relativeUri().value();
    endpoint.Description = method.description() ? method.description().value() : '';

    endpoint.SetOperationId(method.displayName ? method.displayName() : method.displayName, endpoint.Method, endpoint.Path);

    if (method.body()) {
      endpoint.Body = this._mapRequestBody(method.body());
    }

    if (method.queryParameters()) {
      endpoint.QueryString = this._mapQueryString(method.queryParameters());
    }

    if (method.headers()) {
      endpoint.Headers = this._mapRequestHeaders(method.headers());
    }

    if (method.responses()) {
      endpoint.Responses = this._mapResponseBody(method.responses());
    }

    endpoint.traits = [];
    var isMethod = method.is();
    if (isMethod) {
      if (isMethod instanceof Array) {
        endpoint.traits = isMethod;
      } else if (isMethod instanceof Object) {
        endpoint.traits = Object.keys(isMethod);
      }
    }

    endpoint.PathParams = pathParams;

    //endpoint security
    var securedBy = method.securedBy();
    if (Array.isArray(securedBy)) {
      endpoint.securedBy = {};
      for(var si in securedBy) {
        if (!securedBy.hasOwnProperty(si)) continue;
        var schemeSettings = this._getSecuritySchemeSettingsByName(securedBy[si].name());
        switch(schemeSettings.type()) {
          case 'OAuth 2.0':
            endpoint.securedBy['oauth2'] = true;
            break;
          case 'Basic Authentication':
            endpoint.securedBy['basic'] = true;
            break;
          default:
            //TODO not supported
            break;
        }
      }
    }

    //TODO endpoint security

    this.project.addEndpoint(endpoint);
  }

  var resources = resource.resources();
  if(resources && resources.length > 0) {
    for (var j = 0; j < resources.length; j++) {
      this._mapEndpoint(resources[j], baseURI + resource.relativeUri().value(), pathParams);
    }
  }
};

RAML.prototype.loadFile = function (filePath, cb) {
  var me = this;
  parser.loadApi(filePath).then(function(api) {
    me.data = parser.expander.expandTraitsAndResourceTypes(api);
    cb();
  }, function(error) {
    cb(error);
  });
};

RAML.prototype.loadFileWithOptions = function (filePath, options, cb) {
  var me = this;
  parser.loadApi(filePath, options).then(function(api) {
    me.data = parser.expander.expandTraitsAndResourceTypes(api);
    cb();
  }, function(error) {
    cb(error);
  });
};


RAML.prototype.loadData = function (data, options) {
  var me = this;
  return new Promise(function(resolve, reject){
    var parsedData = parser.parseRAMLSync(data, options);
    if (parsedData.name === 'Error') {
      reject(error);
    } else {
      me.data = parser.expander.expandTraitsAndResourceTypes(parsedData);
			//me.data = parsedData.expand(true);
      resolve();
    }
  });
};

RAML.prototype._mapHost = function() {
  var parsedURL = url.parse(this.data.baseUri ? this.data.baseUri().value() : '');
  this.project.Environment.Host = (parsedURL.protocol && parsedURL.host)? (parsedURL.protocol + '//' + parsedURL.host) : null;
  this.project.Environment.BasePath = parsedURL.path;
};

RAML.prototype._mapTraits = function(traitGroups) {
  var slTraits = [];

  for (var i in traitGroups) {
    if (!traitGroups.hasOwnProperty(i)) continue;
    var traitGroup = traitGroups[i];

    for (var k in traitGroup) {
      if (!traitGroup.hasOwnProperty(k)) continue;
      var trait = traitGroup[k],
          slTrait = {
            _id: k,
            name: k,
            request: {},
            responses: []
          };

      if (trait.queryParameters) {
        slTrait.request.queryString = this._mapQueryString(trait.queryParameters);
      }

      if (trait.headers) {
        slTrait.request.headers = this._mapRequestHeaders(trait.headers);
      }

      if (trait.responses) {
        slTrait.responses = this._mapResponse(trait.responses);
      }

      slTraits.push(slTrait);
    }
  }

  return slTraits;
};

RAML.prototype._import = function() {
  this.project = new Project(this.data.title());

  //TODO set project description from documentation
  //How to know which documentation describes the project briefly?
  this.description(this.project, this.data);

  this._mapHost();

  var mediaType = this.data.mediaType();
  if (!_.isEmpty(this.data.protocols())) {
    this.project.Environment.Protocols = this.data.protocols();
  }

  this.project.Environment.DefaultResponseType = '';
  if (mediaType) {
    if (Array.isArray(mediaType)) {
      if (mediaType.length > 0) {
        this.project.Environment.DefaultResponseType = mediaType[0].value();
      }
    } else {
      this.project.Environment.DefaultResponseType = mediaType.value();
    }
  }

  this.project.Environment.DefaultRequestType = this.project.Environment.DefaultResponseType;
  this.project.Environment.Version = this.data.version();

  this.project.Environment.SecuritySchemes = this._mapSecuritySchemes(this.data.securitySchemes());

  var resources = this.data.resources();
  for (var i = 0; i < resources.length; i++) {
    this._mapEndpoint(resources[i], '', {});
  }

  var schemas = this._mapSchema(this.getSchema(this.data));
  for(var s in schemas) {
    if (!schemas.hasOwnProperty(s)) continue;
    this.project.addSchema(schemas[s]);
  }

  this.project.traits = this._mapTraits(this.data.traits());

};

RAML.prototype.description = function(project, data) { throw new Error('description method not implemented'); };

RAML.prototype.mapRequestBody = function(methodBody) { throw new Error('mapRequestBody method not implemented'); };

RAML.prototype.mapSchema = function(schema) { throw new Error('mapSchema method not implemented'); };

RAML.prototype.getSchema = function(data) { throw new Error('getSchema method not implemented'); };

module.exports = RAML;
