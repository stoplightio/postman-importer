const RAML = require('./baseraml'),
	Schema = require('../entities/schema'),
	jsonHelper = require('../utils/json'),
	_ = require('lodash');

class RAML10 extends RAML {
	constructor() {
		super();
	}
	
	mapRequestBody(methodBody) {
		let data = {mimeType: ''};
		
		//TODO: only one, the latest is in effect in stoplight!
		for (let i in methodBody) {
			if (!methodBody.hasOwnProperty(i)) continue;
			let mimeType = methodBody[i];
			
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
						data.body = this.convertObjectProperty(mimeType);
						delete data.body.description;
						// delete data.body.type;
						break;
					case 'multipart/form-data':
					case 'application/x-www-form-urlencoded': {
						data.body = {
							type: 'object',
							'properties': {},
							'required': []
						};
						let formParams = mimeType.properties;
						for (let j in formParams) {
							if (!formParams.hasOwnProperty(j)) continue;
							let param = formParams[j];
							let bodyType = !_.isEmpty(param.type) ? param.type[0] : param.type;
							data.body.properties[param.name] = {
								type: bodyType
							};
							if (param.description) {
								data.body.properties[param.name].description = param.description;
							}
							if (param.format) {
								data.body.properties[param.name].format = param.format;
							}
							RAML._convertRequiredToArray(param, param.name, data.body.required);
						}
						break;
					}
					default:
				}
			}
			else if (RAML10.isArray(mimeType)) {
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
	}
	
	convertObjectProperty(source) {
		let target = Object.assign({}, source);
		target.properties = {};
		target.type = 'object';
		target.required = [];
		
		if (source.description) {
			target.description = jsonHelper.stringify(source.description);
		}
		
		for (let paramName in source.properties) {
			let skipRequired = false;
			if (!source.properties.hasOwnProperty(paramName)) continue;
			let param = source.properties[paramName];
			
			if (RAML10.isArray(param)) {
				target.properties[paramName] = this.convertArray(param);
			}
			else if (RAML10.isFacet(param)) { //check for facets
				target.properties[paramName] = RAML10.convertFacet(param);
			}
			else if (RAML10.isAdditionalProperties(param)) {
				target.additionalProperties = RAML10.convertAdditionalProperties(param);
				skipRequired = true;
			}
			else {
				target.properties[paramName] = param;
			}
			//add annotations
			RAML._addAnnotations(param, target.properties[paramName]);
			
			if (skipRequired) continue;
			
			//required
			RAML._convertRequiredToArray(param, paramName, target['required']);
		}
		if (target.required && target.required.length == 0) {
			delete target.required;
		}
		
		this.convertRefToModel(target);
		
		return target;
	}
	
	mapSchema(schemData) {
		let schemas = [];
		for (let i in schemData) {
			if (!schemData.hasOwnProperty(i)) continue;
			for (let schemaName in schemData[i]) {
				if (!schemData[i].hasOwnProperty(schemaName)) continue;
				let sd = new Schema(schemaName);
				sd.Name = schemaName;
				let definition = schemData[i][schemaName];
				let properties = null;
				let result = definition;
				
				if (definition.properties && !_.isEmpty(definition.properties)) {
					properties = this.convertObjectProperty(definition);
				}
				
				if (definition.type && definition.type != 'object') { //type
					RAML10._removeHarmlessChars(definition.type); //remove ( and )
					RAML10._modifyUnionType(definition.type);
					
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
						else if (RAML10.isArray(definition)) { //check for array
							//convert array
							result = this.convertArray(definition);
						}
						else if (RAML10.isFacet(definition)) { //check for facets
							result = RAML10.convertFacet(definition);
						}
						else if (RAML10.isFixedFacet(definition)) {
							result = RAML10.convertFixedFacet(definition);
						}
						else {
							result = jsonHelper.parse(_.isArray(definition.type) ? definition.type[0] : definition.type);
						}
					}
				} else {
					//only properties
					if (!properties) {
						if (definition.hasOwnProperty('schema')) {
							definition = jsonHelper.parse(_.isArray(definition.schema) ? definition.schema[0] : definition.schema);
							result = this.convertObjectProperty(definition);
						} else if (definition.type == 'object') {
							result = definition;
						}
					}
					else { //type = object with properties
						result = properties;
					}
				}
				//add annotations
				RAML._addAnnotations(definition, result);
				sd.Definition = this.convertRefToModel(result);
				
				schemas.push(sd);
			}
		}
		return schemas;
	}
	
	static _modifyUnionType(type) {
		for (let index in type) {
			if (!type.hasOwnProperty(index)) continue;
			
			if (type[index].includes('|')) {
				type[index] = {
					type: 'object'
				};
			}
		}
		return type;
	}
	
	static _removeHarmlessChars(type) {
		for (let index in type) {
			if (!type.hasOwnProperty(index)) continue;
			
			type[index] = _.replace(_.replace(type[index], ')', ''), '(', '');
		}
		return type;
	}
	
	static isArray(definition) {
		let type = _.isArray(definition.type) ? definition.type[0] : definition.type;
		return ((type === 'array' && definition.items) || (!definition.hasOwnProperty('items') && _.endsWith(type, '[]')));
	}
	
	static isFacet(definition) {
		return definition.facets;
	}
	
	static isAdditionalProperties(definition) {
		return _.startsWith(definition.name, '/') && _.endsWith(definition.name, '/');
	}
	
	static isFixedFacet(definition) {
		return definition.fixedFacets;
	}
	
	convertArray(definition) {
		if (definition.hasOwnProperty('items')) {
			if (definition.items.hasOwnProperty('type')) {
				definition.items.type = _.isArray(definition.items.type) ? definition.items.type[0] : definition.items.type;
			}
			else {
				let items = definition.items;
				if (RAML10.isRamlArray(items)) {
					definition.items = this.convertArray(RAML10.convertRamlArray(definition.items));
				} else {
					definition.items = {};
					definition.items.type = items;
				}
			}
		} else {
			let type = _.isArray(definition.type) ? definition.type[0] : definition.type;
			definition = RAML10.convertRamlArray(type);
		}
		definition.type = 'array';
		
		return definition;
	}
	
	static isRamlArray(object) {
		return _.endsWith(object, '[]');
	}
	
	static convertRamlArray(object) {
		return {
			type: 'array',
			items: {
				type: _.replace(object, '[]', '')
			}
		};
	}
	
	static convertAdditionalProperties(definition) {
		let pattern = definition.name;
		if (pattern !== '//') {
			definition['x-raml-pattern'] = pattern;
		}
		delete definition.name;
		return definition;
	}
	
	static convertFacet(definition) {
		let facets = definition.facets;
		let result = [];
		for (let key in facets) {
			if (!facets.hasOwnProperty(key)) continue;
			let facet = facets[key];
			facet[key] = _.isArray(facet.type) ? facet.type[0] : facet.type;
			delete facet.name;
			delete facet.type;
			result.push(facet);
		}
		definition['x-facets'] = result;
		delete definition.facets;
		
		return definition;
	}
	
	static convertFixedFacet(definition) {
		let fixedFacets = definition.fixedFacets;
		for (let key in fixedFacets) {
			if (!fixedFacets.hasOwnProperty(key)) continue;
			definition['x-' + key] = fixedFacets[key];
		}
		delete definition.fixedFacets;
		
		return definition;
	}
	
	//noinspection JSMethodCanBeStatic
	getSchema(data) {
		return data.types;
	}
	
	description(project, data) {
		if (data.description) {
			project.Description = data.description;
		}
	}
}
module.exports = RAML10;
