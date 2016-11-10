var _ = require('lodash'),
    RAML = require('./baseraml'),
    jsonHelper = require('../utils/json');

function RAML10() {}
RAML10.prototype = new RAML();

RAML10.prototype.version = function() {
    return '1.0';
};


RAML10.prototype.mapMediaType = function(consumes, produces) {
    var mediaTypes = [];
    if (consumes && consumes.length > 0) {
        mediaTypes = consumes;
    }

    if (_.isArray(produces)) {
        mediaTypes = mediaTypes.concat(produces);
    }
    mediaTypes = _.uniq(mediaTypes);
    if (mediaTypes.length === 1) {
        return mediaTypes[0];
    }
    return mediaTypes.length ? mediaTypes:null;
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
	var body = jsonHelper.parse(bodyData.body);
	var result = this.convertAllOfToModel(this.convertRefFromModel(body));
	if (bodyData.example) {
			result.example = jsonHelper.parse(bodyData.example);
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
				
				if (property.hasOwnProperty('allowEmptyValue')) {
					this.hasAllowEmptyValue = true;
					property['(oas-allowEmptyValue)'] = property.allowEmptyValue;
					delete property.allowEmptyValue;
				}
	
			if (property.hasOwnProperty('exclusiveMaximum')) {
				this.hasExclusiveMaximum = true;
				property['(oas-exclusiveMaximum)'] = property.exclusiveMaximum;
				delete property.exclusiveMaximum;
			}
	
			if (property.hasOwnProperty('exclusiveMinimum')) {
				this.hasExclusiveMinimum = true;
				property['(oas-exclusiveMinimum)'] = property.exclusiveMinimum;
				delete property.exclusiveMinimum;
			}
				
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

RAML10.prototype.convertAllOfToModel = function(object) {
	for (var id in object) {
		if (!object.hasOwnProperty(id)) continue;

		var val = object[id];
		if (!val) continue;

		if (id == 'allOf') {
			object = this.convertAllOfAttribute(object);
		} else if (typeof val === 'object') {
			object[id] = this.convertAllOfToModel(val);
		}
	}

	return object;
};


RAML10.prototype.convertAllOfAttribute = function(definition) {
	var result = {};
	var allOfTypes = [];
	if (!definition.allOf) return definition;

	for (var j in definition.allOf){
		if (!definition.allOf.hasOwnProperty(j)) continue;
		var allOf = definition.allOf[j];
		if (allOf.properties) {
			result = this.mapSchemaProperties(allOf);
		} else if (allOf.type) {
			allOfTypes.push(allOf.type);
		}
	}

	result.type = allOfTypes.length > 1 ? allOfTypes : allOfTypes[0];
	
	delete result.allOf;

	// definition.type = allOfTypes.length > 1 ? allOfTypes : allOfTypes[0];
	//
	// delete definition.allOf;


	return result;
};

RAML10.prototype.mapSchema = function(slSchemas) {
	var results = {};
	for (var i in slSchemas) {
		if (!slSchemas.hasOwnProperty(i)) continue;
		var schema = slSchemas[i];
		var definition = this.convertRefFromModel(jsonHelper.parse(schema.Definition));

		if (definition.allOf) {
			definition = this.convertAllOfToModel(definition);
		} else {
			if (definition.properties) {
				definition = this.mapSchemaProperties(definition);
			}
		}

		
		if (definition.additionalProperties) {
			if (!definition.properties) {
				definition.properties = {};
			}
			definition.properties['//'] = definition.additionalProperties;
			delete definition.additionalProperties;
		}
		
		if (schema.example) {
			definition.example = jsonHelper.parse(schema.example);

		// var example = jsonHelper.parse(schema.example);
		// if (!_.isEmpty(example)) {
		// 	definition.example = example;
		}

		results[schema.NameSpace] = definition;
	}
	return results;
};

RAML10.prototype.mapSchemaProperties = function(definition) {
	for (var k in definition.properties) {
		if (!definition.properties.hasOwnProperty(k)) continue;
		var property = definition.properties[k];
		property.required = false;
	}

	if (definition.required && definition.required.length > 0) {
		for(var j in definition.required) {
			if (!definition.required.hasOwnProperty(j)) continue;
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

	return definition;
};

RAML10.prototype.description = function(ramlDef, project) {
	ramlDef.description = project.Description;
};

RAML10.prototype.getApiKeyType = function () {
	return 'Pass Through';
};

RAML10.prototype.mapSecuritySchemes = function(securitySchemes) {
	return securitySchemes;
};

RAML10.prototype.setMethodDisplayName = function(method, displayName) {
	if (displayName) {
		method.displayName = displayName;
	}
};

RAML10.prototype.initializeTraits = function() {
	return {};
};

RAML10.prototype.addTrait = function(id, trait, traits) {
	traits[_.camelCase(id)] = trait;
};

module.exports = RAML10;
