var RAML = require('./baseraml'),
    Schema = require('../entities/schema'),
    jsonHelper = require('../utils/json'),
    _ = require('lodash');

function RAML10() {}
RAML10.prototype = new RAML();

RAML10.prototype.mapRequestBody = function(methodBody) {
	var data = {mimeType: ''};

	//TODO: only one, the latest is in effect in stoplight!
	for (var i in methodBody) {
		if (!methodBody.hasOwnProperty(i)) continue;
		var mimeType = methodBody[i];

		data.mimeType = i;
		if (mimeType.example) {
			data.example = mimeType.example;
			delete mimeType.example;
		}

		if (mimeType.description) {
			data.description = mimeType.description;
		}

		if (mimeType.properties && !_.isEmpty(mimeType.properties)) {
			switch (data.mimeType) {
				case 'application/json':
					data.body = {'properties': this.convertRefToModel(mimeType.properties)};
					this.convertRequiredFromProperties(data.body);
					break;
				case 'multipart/form-data':
				case 'application/x-www-form-urlencoded':
					data.body = {
						type: 'object',
						'properties': {},
						'required': []
					};
					var formParams = mimeType.properties;
					for (var j in formParams) {
						if (!formParams.hasOwnProperty(j)) continue;
						var param = formParams[j];
						var bodyType = !_.isEmpty(param.type) ? param.type[0] : param.type;
						data.body.properties[param.name] = {
							type: bodyType
						};
						if (param.description) {
							data.body.properties[param.name].description = param.description;
						}
						if (param.format) {
							data.body.properties[param.name].format = param.format;
						}
						if (param.required == true) {
							data.body.required.push(param.name);
						}
					}
					break;
				default:
			}
		}
		else if (this.isArray(mimeType)) {
			data.body = this.convertRefToModel(this.convertArray(mimeType));
		}
		else if (mimeType.schema && !_.isEmpty(mimeType.schema)) {
			data.body = this.convertRefToModel({
				type: mimeType.schema[0]
			});
		}
		else if (mimeType.type && !_.isEmpty(mimeType.type) && mimeType.type[0] !== 'object') {
			data.body = this.convertRefToModel({
				type: mimeType.type[0]
			});
		}
	}

	return data;
};


RAML10.prototype.mapSchema = function(schemData) {
	var schemas = [];
	for (var i in schemData) {
		if (!schemData.hasOwnProperty(i)) continue;
		for (var schemaName in schemData[i]) {
			if (!schemData[i].hasOwnProperty(schemaName)) continue;
			var sd = new Schema(schemaName);
			sd.Name = schemaName;
			var definition = schemData[i][schemaName];
			var properties = null;
			var result = definition;

			if (definition.properties && !_.isEmpty(definition.properties)) {
				properties = {
					properties: {},
					type: 'object',
					required: []
				};
				if (definition.description) {
					properties.description = jsonHelper.stringify(definition.description);
				}
				for (var paramName in definition.properties) {
					if (!definition.properties.hasOwnProperty(paramName)) continue;
					var param = definition.properties[paramName];
					
					if (this.isArray(param)) {
						properties.properties[paramName] = this.convertArray(param);
					}
					else if (this.isFacet(param)) { //check for facets
						properties.properties[paramName] = this.convertFacet(param);
					}
					else {
						properties.properties[paramName] = param;
					}
					//add annotations
					this._addAnnotations(param, properties.properties[paramName]);
					
					
					if (param.hasOwnProperty('required')) {
						if (param.required == true) {
							properties['required'].push(paramName);
						}
						delete param.required;
					}
					else {
						//required true by default.
						properties['required'].push(paramName);
					}
				}
				if (properties.required && properties.required.length == 0) {
					delete properties.required;
				}
			}
			
			if (definition.type && definition.type != 'object') { //type
				if (properties) { //type and properties
					result.allOf = definition.type;
					result.allOf.push(properties);
					delete result.type;
					delete result.properties;
				} else {
					if (_.isArray(definition.type) && definition.type.length > 1) {
						result.allOf = definition.type;
						delete result.type;
					}
					else if (this.isArray(definition)) { //check for array
						//convert array
						result = this.convertArray(definition);
					}
					else if (this.isFacet(definition)) { //check for facets
						result = this.convertFacet(definition);
					}
					else if (this.isFixedFacet(definition)) {
						result = this.convertFixedFacet(definition);
					}
					else {
						result = jsonHelper.parse(_.isArray(definition.type) ? definition.type[0] : definition.type);
					}
				}
			} else { //only properties
				result = properties;
			}
			//add annotations
			this._addAnnotations(definition, result);
			sd.Definition = this.convertRefToModel(result);
			
			schemas.push(sd);
		}
	}
	return schemas;
};

RAML10.prototype.isArray = function(definition) {
	var type = _.isArray(definition.type) ? definition.type[0] : definition.type;
	return type === 'array' && definition.items;
};

RAML10.prototype.isFacet = function(definition) {
	return definition.facets;
};

RAML10.prototype.isFixedFacet = function(definition) {
	return definition.fixedFacets;
};

RAML10.prototype.convertArray = function(definition) {
	if (definition.items.type) {
		definition.items.type = _.isArray(definition.items.type) ? definition.items.type[0] : definition.items.type;
	} else {
		var items = definition.items;
		if (this.isRamlArray(items)) {
			definition.items = this.convertArray(this.convertRamlArray(definition.items));
		} else {
			definition.items = {};
			definition.items.type = items;
		}
	}
	definition.type = 'array';
	
	return definition;
};

RAML10.prototype.isRamlArray = function (object) {
	return _.endsWith(object, '[]');
};

RAML10.prototype.convertRamlArray = function (object) {
	return {
		type: 'array',
		items: {
			type: _.replace(object, '[]', '')
		}
	};
};

RAML10.prototype.convertFacet = function(definition) {
	var facets = definition.facets;
	var result = [];
	for (var key in facets) {
		if (!facets.hasOwnProperty(key)) continue;
		var facet = facets[key];
		facet[key] = _.isArray(facet.type) ? facet.type[0] : facet.type;
		delete facet.name;
		delete facet.type;
		result.push(facet);
	}
	definition['x-facets'] = result;
	delete definition.facets;
	
	return definition;
};

RAML10.prototype.convertFixedFacet = function(definition) {
	var result = [];
	var fixedFacets = definition.fixedFacets;
	for (var key in fixedFacets) {
		if (!fixedFacets.hasOwnProperty(key)) continue;
		definition['x-' + key] = fixedFacets[key];
	}
	delete definition.fixedFacets;
	
	return definition;
};

RAML10.prototype.getSchema = function (data) {
    return data.types;
};

RAML10.prototype.description = function(project, data) {
	if (data.description) {
		project.Description = data.description;
	}
};

module.exports = RAML10;
