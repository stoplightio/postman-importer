const RAMLImporter = require('./baseraml'),
	Schema = require('../entities/schema'),
	jsonHelper = require('../utils/json'),
	_ = require('lodash');

class RAML10Importer extends RAMLImporter {
	constructor() {
		super();
	}
	
	mapRequestBody(methodBody, checkEmptyType) {
		const data = {mimeType: ''};
		
		//TODO: only one, the latest is in effect in stoplight!
		for (const i in methodBody) {
			if (!methodBody.hasOwnProperty(i)) continue;
			const mimeType = methodBody[i];

			if (checkEmptyType) {
				RAMLImporter._fillDefaultType(mimeType);
			}
			
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
						data.body = RAML10Importer.convertObjectProperty(mimeType);
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
						const formParams = mimeType.properties;
						for (const j in formParams) {
							if (!formParams.hasOwnProperty(j)) continue;
							const param = formParams[j];
							const bodyType = !_.isEmpty(param.type) ? param.type[0] : param.type;
							data.body.properties[param.name] = {
								type: bodyType
							};
							if (param.description) {
								data.body.properties[param.name].description = param.description;
							}
							if (param.format) {
								data.body.properties[param.name].format = param.format;
							}
							RAMLImporter._convertRequiredToArray(param, param.name, data.body.required);
						}
						break;
					}
					default:
				}
			}
			else if (RAML10Importer.isArray(mimeType)) {
				data.body = RAMLImporter.convertRefToModel(RAML10Importer.convertArray(mimeType));
			}
			else if (mimeType.schema && !_.isEmpty(mimeType.schema)) {
				data.body = RAMLImporter.convertRefToModel({
					type: mimeType.schema[0]
				});
			}
			else if (mimeType.type && !_.isEmpty(mimeType.type) && mimeType.type[0] !== 'object') {
				data.body = RAMLImporter.convertRefToModel({
					type: mimeType.type[0]
				});
			}
		}
		
		return data;
	}
	
	static convertObjectProperty(source) {
		const target = Object.assign({}, source);
		target.properties = {};
		target.type = 'object';
		target.required = [];

		if (source.description) {
			target.description = jsonHelper.stringify(source.description);
		}
		
		for (const paramName in source.properties) {
			let skipRequired = false;
			if (!source.properties.hasOwnProperty(paramName)) continue;
			const param = source.properties[paramName];

			if (RAML10Importer.isArray(param)) {
				target.properties[paramName] = RAML10Importer.convertArray(param);
			}
			else if (RAML10Importer.isFacet(param)) { //check for facets
				target.properties[paramName] = RAML10Importer.convertFacet(param);
			}
			else if (RAML10Importer.isAdditionalProperties(param)) {
				target.additionalProperties = RAML10Importer.convertAdditionalProperties(param);
				skipRequired = true;
			}
			else {
				target.properties[paramName] = param;
			}
			//add annotations
			RAMLImporter._addAnnotations(param, target.properties[paramName]);
			
			if (skipRequired) continue;
			
			//required
			RAMLImporter._convertRequiredToArray(param, paramName, target['required']);
			if (param.properties && !_.isEmpty(param.properties))
				target.properties[paramName] = this.convertObjectProperty(param);
		}
		if (target.required && target.required.length == 0) {
			delete target.required;
		}
		if (target.properties && _.isEmpty(target.properties)) {
			delete target.properties;
		}

		RAMLImporter.convertRefToModel(target);
		
		return target;
	}
	
	mapSchema(schemData) {
		const schemas = [];
		for (const i in schemData) {
			if (!schemData.hasOwnProperty(i)) continue;
			for (const schemaName in schemData[i]) {
				if (!schemData[i].hasOwnProperty(schemaName)) continue;
				const sd = new Schema(schemaName);
				sd.Name = schemaName;
				let definition = schemData[i][schemaName];
				let properties = null;
				let result = definition;
				
				if (definition.properties && !_.isEmpty(definition.properties)) {
					properties = RAML10Importer.convertObjectProperty(definition);
				}
				
				if (definition.type && definition.type != 'object') { //type
					RAML10Importer._removeHarmlessChars(definition.type); //remove ( and )
					RAML10Importer._modifyUnionType(definition);
					
					if (properties) { //type and properties
						result.allOf = definition.type;
						result.allOf.push(properties);
						delete result.type;
						delete result.properties;
					} else {
						result = RAML10Importer._convertCustomTypes(definition);
						if (_.isArray(definition.type) && definition.type.length > 1) {
							result.allOf = definition.type;
							delete result.type;
						}
						else { //definition.type is json string value. or type=object
							let jsonObject = jsonHelper.parse(_.isArray(definition.type) ? definition.type[0] : definition.type);
							if (typeof jsonObject === 'object') {
								jsonObject = RAML10Importer.convertObjectProperty(jsonObject);
								result = jsonObject;
							}
						}
					}
				} else {
					//only properties
					if (!properties) {
						if (definition.hasOwnProperty('schema')) {
							definition = jsonHelper.parse(_.isArray(definition.schema) ? definition.schema[0] : definition.schema);
							result = RAML10Importer.convertObjectProperty(definition);
						} else if (definition.type == 'object') {
							result = definition;
						}
					}
					else { //type = object with properties
						result = properties;
					}
				}
				//add annotations
				RAMLImporter._addAnnotations(definition, result);
				result = RAML10Importer._convertCustomTypes(result);
				sd.Definition = RAMLImporter.convertRefToModel(result);
				
				schemas.push(sd);
			}
		}
		return schemas;
	}
	
	static _convertCustomTypes(result) {
		if (RAML10Importer.isArray(result)) { //check for array
			//convert array
			result = RAML10Importer.convertArray(result);
		}
		else if (RAML10Importer.isFacet(result)) { //check for facets
			result = RAML10Importer.convertFacet(result);
		}
		else if (RAML10Importer.isFixedFacet(result)) {
			result = RAML10Importer.convertFixedFacet(result);
		}
		return result;
	}
	
	static _modifyUnionType(definition) {
		const type = definition.type;
		
		if (type.length > 1) {
			definition['x-raml-union-type-definition'] = '[' + _.join(type, ',') + ']';
		}
		
		for (const index in type) {
			if (!type.hasOwnProperty(index)) continue;
			
			if (type[index].includes('|')) {
				type[index] = {
					type: 'object'
				};
			}
		}

		return definition;
	}
	
	static _removeHarmlessChars(type) {
		for (const index in type) {
			if (!type.hasOwnProperty(index)) continue;
			
			type[index] = _.replace(_.replace(type[index], ')', ''), '(', '');
		}
		return type;
	}
	
	static isArray(definition) {
		const type = _.isArray(definition.type) ? definition.type[0] : definition.type;
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
	
	static convertArray(definition) {
		if (definition.hasOwnProperty('items')) {
			if (definition.items.hasOwnProperty('type')) {
				definition.items.type = _.isArray(definition.items.type) ? definition.items.type[0] : definition.items.type;
			}
			else {
				const items = definition.items;
				if (RAML10Importer.isRamlArray(items)) {
					definition.items = RAML10Importer.convertArray(RAML10Importer.convertRamlArray(definition.items));
				} else {
					if (typeof items !== 'object' || _.isArray(items)){
						definition.items = {
							type: items
						};
					}
				}
			}
		} else {
			const type = _.isArray(definition.type) ? definition.type[0] : definition.type;
			definition = RAML10Importer.convertRamlArray(type);
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
		const pattern = definition.name;
		if (pattern !== '//') {
			definition['x-raml-pattern'] = pattern;
		}
		delete definition.name;
		return definition;
	}
	
	static convertFacet(definition) {
		const facets = definition.facets;
    const result = [];
		for (const key in facets) {
			if (!facets.hasOwnProperty(key)) continue;
      const facet = facets[key];
			facet[key] = _.isArray(facet.type) ? facet.type[0] : facet.type;
			delete facet.name;
			delete facet.type;
      delete facet.typePropertyKind;
			result.push(facet);
		}
		definition['x-raml-facets'] = result;
		delete definition.facets;
		
		return definition;
	}
	
	static convertFixedFacet(definition) {
		const fixedFacets = definition.fixedFacets;
		for (const key in fixedFacets) {
			if (!fixedFacets.hasOwnProperty(key)) continue;
			if (definition.hasOwnProperty(key)) {
				definition[key] = fixedFacets[key];
			} else {
				definition['x-' + key] = fixedFacets[key];
			}
		}
		delete definition.fixedFacets;
		
		return definition;
	}
	
	//noinspection JSMethodCanBeStatic
	getSchema(data) {
		return data.types || data.schemas;
	}
	
	description(project, data) {
		if (data.description) {
			project.Description = data.description;
		}
	}
}
module.exports = RAML10Importer;
