var RAML = require('./baseraml'),
    Schema = require('../entities/schema'),
    jsonHelper = require('../utils/json'),
    YAML = require('js-yaml'),
    _ = require('lodash');

function RAML10() {}
RAML10.prototype = new RAML();

RAML10.prototype.mapRequestBody = function(methodBody) {
    var data = {mimeType: ''};

    //TODO: only one, the latest is in effect in stoplight!
    for (var i in methodBody) {
        if (!methodBody.hasOwnProperty(i)) continue;
        var mimeType = methodBody[i];

        data.mimeType = mimeType.name();
        if (mimeType.example()) {
            data.example = mimeType.example().value();
        }

        if (mimeType.description()) {
            data.description = mimeType.description().value();
        }
        if (mimeType.properties && !_.isEmpty(mimeType.properties())) {
            switch (data.mimeType) {
                case 'application/json':
                  data.body = YAML.load(mimeType.dump())[data.mimeType];
                  break;
                case 'multipart/form-data':
                case 'application/x-www-form-urlencoded':
                    data.body = {
                        type: 'object',
                        'properties': {},
                        'required': []
                    };
                    var formParams = mimeType.properties();
                    for (var j in formParams) {
                        if (!formParams.hasOwnProperty(j)) continue;
                        var param = formParams[j];
                        var bodyType = !_.isEmpty(param.type()) ? param.type()[0] : param.type();
                        data.body.properties[param.name()] = {
                            type: bodyType
                        };
                        if (param.description()) {
                            data.body.properties[param.name()].description = param.description().value();
                        }
                        if (param.format) {
                            data.body.properties[param.name()].format = param.format();
                        }

                        if (param.required() == true) {
                            data.body.required.push(param.name());
                        }
                    }
                  break;
                default:
            }
        }

        else if (mimeType.schema && !_.isEmpty(mimeType.schema())) {
            data.body = this.convertRefToModel({
                type : jsonHelper.parse(mimeType.schema()[0])
            });
        }
        else if (mimeType.type && !_.isEmpty(mimeType.type()) && mimeType.type()[0] !== 'object') {
            data.body = this.convertRefToModel({
                type: jsonHelper.parse(mimeType.type()[0])
            });
        }
    }

    return data;
};


RAML10.prototype.mapSchema = function(schemData) {
    var schemas = [];
    for (var i in schemData) {
        if (!schemData.hasOwnProperty(i)) continue;
        var schema = schemData[i];
        var schemaName = schema.name();
        var sd = new Schema(schemaName);
        sd.Name = schemaName;

        var definition;
        if (jsonHelper.isEmptySchema(schema)) {
            definition = YAML.load(schema.dump())[schemaName];
        } else {
            if (schema.type && !_.isEmpty(schema.type())) {
                definition = jsonHelper.parse(schema.type()[0]);
            }
        }

				if (definition.properties && !_.isEmpty(definition.properties)) {
					var data = {
						properties: {},
						type: 'object',
						required: []
					};
					if (definition.description) {
						data.description = definition.description;
					}
					for (var paramName in definition.properties) {
						var param = definition.properties[paramName];
						data.properties[paramName] = param;
		
						if (param.hasOwnProperty('required')) {
							if (param.required == true) {
								data['required'].push(paramName);
							}
							delete param.required;
						}
						else {
							//required true by default.
							data['required'].push(paramName);
						}
					}
		
					definition = data;
				}
				if (data.required.length == 0) {
					delete data.required;
				}
				
			 	sd.Definition = this.convertRefToModel(definition);
        schemas.push(sd);
    }
    return schemas;
};

RAML10.prototype.getSchema = function (data) {
    return data.types();
};

RAML10.prototype.description = function(project, data) {
	if (data.description && data.description()) {
		project.Description = data.description().value();
	}
};

module.exports = RAML10;