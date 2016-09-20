var RAML = require('./baseraml'),
    jsonHelper = require('../utils/json');

function RAML10() {}
RAML10.prototype = new RAML();

RAML10.prototype.version = function() {
    return '1.0';
};

RAML10.prototype.mapAuthorizationGrants = function(flow) {
    var ag = [];
    switch (flow) {
        case 'implicit':
            ag = ['implicit'];
            break;
        case 'password':
            ag = ['password'];
            break;
        case 'application':
            ag = ['client_credentials'];
            break;
        case 'accessCode':
            ag = ['authorization_code'];
            break;
    }
    return ag;
};

RAML10.prototype.mapBody = function(bodyData) {
    var result = this.convertRefFromModel(jsonHelper.parse(bodyData.body));
    if (bodyData.example) {
        result.example = jsonHelper.format(bodyData.example);
    }
    return result;
};

RAML10.prototype.mapRequestBodyForm = function(bodyData) {
    var body = {
        properties: bodyData.properties
    };

    /**
     * Two different approaches to declare an optional parameter.
     * source https://github.com/raml-org/raml-spec/blob/master/versions/raml-10/raml-10.md#property-declarations
     * a) appending '?' to property name (without declaring required parameter).
     * b) set required = false
     */
    for (var i in body.properties) {
        if (!body.properties.hasOwnProperty(i)) continue;
        var property = body.properties[i];
        property.required = false;
    }

    if (bodyData.required && bodyData.required.length > 0) {
        for(var j in bodyData.required) {
            if (!bodyData.required.hasOwnProperty(j)) continue;
            var requiredParam = bodyData.required[j];
            if (body['properties'][requiredParam]) {
                body['properties'][requiredParam].required = true;
            }
        }
    }

    return body;
};

RAML10.prototype.addSchema = function(ramlDef, schema) {
    ramlDef.types = schema;
};

RAML10.prototype.mapSchema = function(slSchemas) {
    var results = {};
    for (var i in slSchemas) {
        if (!slSchemas.hasOwnProperty(i)) continue;
        var schema = slSchemas[i];
        var definition = this.convertRefFromModel(schema.Definition);
	
				for (var i in definition.properties) {
					var property = definition.properties[i];
					property.required = false;
				}
	
				if (definition.required && definition.required.length > 0) {
					for(var j in definition.required) {
						var requiredParam = definition.required[j];
						if (definition['properties'][requiredParam]) {
							delete definition['properties'][requiredParam].required;
							// definition['properties'][requiredParam].required = true;
						}
					}
					delete definition.required;
				}
				
				if (definition.additionalProperties) {
					definition.properties['//'] = definition.additionalProperties;
					delete definition.additionalProperties;
				}
				
				if (definition.properties && definition.type == 'object') {
					delete definition.type;
				}
				
				if (schema.example) {
					definition.example = jsonHelper.parse(schema.example);
				}
	      results[schema.NameSpace] = definition;
    }
    return results;
};

RAML10.prototype.description = function(ramlDef, project) {
	ramlDef.description = project.Description;
};

module.exports = RAML10;