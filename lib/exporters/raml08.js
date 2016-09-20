var RAML = require('./baseraml'),
    jsonHelper = require('../utils/json');

function RAML08() {}
RAML08.prototype = new RAML();

RAML08.prototype.version = function() {
    return '0.8';
};

RAML08.prototype.mapAuthorizationGrants = function(flow) {
    var ag = [];
    switch (flow) {
        case 'implicit':
            ag = ['token'];
            break;
        case 'password':
            ag = ['credentials'];
            break;
        case 'application':
            ag = ['owner'];
            break;
        case 'accessCode':
            ag = ['code'];
            break;
    }
    return ag;
};

RAML08.prototype.mapRequestBodyForm = function(bodyData) {
    var body = {
        formParameters: bodyData.properties
    };
    if (bodyData.required && bodyData.required.length > 0) {
        for (var i in bodyData.required) {
            if (!bodyData.required.hasOwnProperty(i)) continue;
            var requiredParam = bodyData.required[i];
            if (body['formParameters'][requiredParam]) {
                body['formParameters'][requiredParam].required = true;
            }
        }
    }

    return body;
};

RAML08.prototype.mapBody = function(bodyData) {
    return {
        schema: jsonHelper.format(bodyData.body),
        example: jsonHelper.format(bodyData.example)
    };
};

RAML08.prototype.addSchema = function(ramlDef, schema) {
    ramlDef.schemas = schema;
};

RAML08.prototype.mapSchema = function(slSchemas) {  var results = [];
    for (var i in slSchemas) {
        if (!slSchemas.hasOwnProperty(i)) continue;
        var schema = slSchemas[i];
        var resultSchema = {};
        resultSchema[schema.NameSpace] =  this.convertRefFromModel(schema.Definition);
        results.push(resultSchema);
    }
    return results;
};

RAML08.prototype.description = function(ramlDef, project) {
	ramlDef.documentation = [{
	  title: project.Name,
	  content: project.Description
	}];
};


module.exports = RAML08;