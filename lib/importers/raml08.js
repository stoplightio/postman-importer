var RAML = require('./baseraml'),
    Schema = require('../entities/schema'),
    jsonHelper = require('../utils/json'),
    YAML = require('js-yaml'),
		Text = require('../entities/text');

function RAML08() {}
RAML08.prototype = new RAML();

RAML08.prototype.mapRequestBody = function(methodBody) {
    var data = {mimeType: '', body: {}, example: ''};

    //TODO: only one, the latest is in effect in stoplight!
    for (var i in methodBody) {
        if (!methodBody.hasOwnProperty(i)) continue;
        var mimeType = methodBody[i];

        data.mimeType = mimeType.name();
        if (mimeType.example()) {
            data.example = mimeType.example().value();
        }

        if (mimeType.formParameters()) {
            data.body = {
                type: 'object',
                'properties': {},
                'required': []
            };
            var formParams = mimeType.formParameters();
            for (var j in formParams) {
                if (!formParams.hasOwnProperty(j)) continue;
                var param = formParams[j];
                var definition = jsonHelper.parse(YAML.load(param.dump()));

                for (var paramId in definition) {
                    if (!definition.hasOwnProperty(paramId)) continue;
                    var paramValue = definition[paramId];
                    data.body.properties[paramId] = paramValue;

                    if (paramValue.required && paramValue.required) {
                        data.body.required.push(paramId);
                    }
                }
            }
        }
        if (mimeType.schema && mimeType.schema()) {
            data.body = jsonHelper.parse(YAML.load(mimeType.dump())[mimeType.name()].schema);
        }
    }

    return data;
};

RAML08.prototype.mapSchema = function(schemData) {
    var schemas = [];
    for (var i in schemData) {
        if (!schemData.hasOwnProperty(i)) continue;
        var schema = schemData[i];
        var schemaName = schema.key();
        var sd = new Schema(schemaName);
        sd.Name = schemaName;
        sd.Definition = this.convertRefToModel(jsonHelper.parse(YAML.load(schema.dump())[schemaName]));

        schemas.push(sd);
    }
    return schemas;
};

RAML08.prototype.getSchema = function (data) {
    return data.schemas();
};

RAML08.prototype.description = function(project, data) {
	var documentation = data.documentation();
	if (documentation && documentation.length > 0) {
		project.Description = documentation[0].content().value();
		project.Environment.summary = documentation[0].content().value();
	}
	
	// text sections
	if (documentation) {
		for (var d in documentation) {
			if (!documentation.hasOwnProperty(d)) continue;
			var txt = new Text(documentation[d].title());
			txt.Public = true;
			txt.Content = documentation[d].content().value();
			this.project.addText(txt);
		}
	}
};

module.exports = RAML08;