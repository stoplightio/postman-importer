var jsonHelper = require('../utils/json');
var stringHelper = require('../utils/strings');

function Endpoint(name) {
  this._id = null;
  this.name = name;
  this.description = '';
  this.tags = [];
  this.request = {};
  this.request.pathParams = {};
  this.request.bodies = [];
  this.request.headers = '{}';
  this.responses = [];

  this.middlewareBefore = '';
  this.middlewareAfter = '';
  this.mock = {
    enabled: false,
    statusCode: 200
  };
  this.securedBy = {
    none : true
  };
  this.public = true;
	this.deprecated = null;
	this.externalDocs = null;
}

Endpoint.prototype = {
    SetOperationId: function(operationId, method, path) {
      if (operationId) {
        this.operationId = operationId;
      } else {
        this.operationId = stringHelper.computeOperationId(method, path);
      }
    },

    get Id() {
      return this._id;
    },
    set Id(id) {
      this._id = id;
    },
    get Path() {
      return this.request.path;
    },
    set Path(path) {
      this.request.path = path;
    },
    get Method() {
      return this.request.method;
    },
    set Method(requestMethod) {
      this.request.method = requestMethod.toLowerCase();
    },

    set Name(name) {
      if (!name) {
        return;
      }
      if (name.length > 120) {
        this.name = name.substring(0, 119);
      }
      else {
        this.name = name;
      }
    },

    get Name() {
      return this.name || '';
    },

    get Headers() {
      return jsonHelper.parse(this.request.headers);
    },
    set Headers(headers) {
      this.request.headers = jsonHelper.stringify(headers, 4);
    },
    get Before() {
      return this.middlewareBefore;
    },
    set Before(before) {
      this.middlewareBefore = before;
    },
    get After() {
      return this.middlewareAfter;
    },
    set After(after) {
      this.middlewareAfter = after;
    },
    set Body(body) {
      body.body = jsonHelper.stringify(body.body, 4);
      this.request.bodies.push(body);
    },
    get Body() {
      if (Array.isArray(this.request.bodies) && this.request.bodies.length > 0) {
        return this.request.bodies[0];
      }
      return {};
    },
    set QueryString(queryString) {
      queryString = jsonHelper.stringify(queryString, 4);
      this.request.queryString = queryString;
    },
    get QueryString() {
      if (!this.request.queryString) {
        this.request.queryString = '{}';
      }
      return jsonHelper.parse(this.request.queryString);
    },
    set PathParams(uriParams) {
      this.request.pathParams = jsonHelper.stringify(uriParams, 4);
    },
    get PathParams() {
      if (!this.request.pathParams) {
        this.request.pathParams = '{}';
      }
      return jsonHelper.parse(this.request.pathParams);
    },
    set Responses(res) {
      this.responses = res;
    },
    get Responses() {
      return this.responses;
    },

    set SLData(data) {
      for(var key in data) {
        this[key] = data[key];
      }
    },

    set Description(desc) {
      this.description = desc;
    },
    get Description() {
      return this.description || '';
    },

    get Tags() {
      return this.tags;
    },
    set Tags(tags) {
      this.tags = tags;
    },

    set Summary(desc) {
      this.summary = desc;
    },
    get Summary() {
      return this.summary || '';
    },

    set SecuredBy(security) {
      this.securedBy = security;
    },
    get SecuredBy() {
      return this.securedBy;
    },
    set Mock(mock) {
      this.mock = mock;
    },
    get Mock() {
      return this.mock;
    },
    get Request() {
      return this.request;
    },
    get Public() {
      return this.public;
    },
	
		get Deprecated() {
			return this.deprecated;
		},
		set Deprecated(deprecated) {
			this.deprecated = deprecated;
		},
		get ExternalDocs() {
			return this.externalDocs;
		},
		set ExternalDocs(externalDocs) {
			this.externalDocs = externalDocs;
		}
};


module.exports = Endpoint;
