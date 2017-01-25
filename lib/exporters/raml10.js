const _ = require('lodash'),
	RAMLExporter = require('./baseraml'),
  stringHelper = require('../utils/strings'),
	ramlHelper = require('../helpers/raml'),
	jsonHelper = require('../utils/json');

class RAML10Exporter extends RAMLExporter {
	constructor() {
		super();
	}
	
	version() {
		return '1.0';
	}
	
	mapMediaType(consumes, produces) {
		let mediaTypes = [];
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
		return mediaTypes.length ? mediaTypes : null;
	}
	
	mapAuthorizationGrants(flow) {
		let ag = [];
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
	}
	
	mapBody(bodyData, type) {
		const body = jsonHelper.parse(bodyData.body);
		let result = this.convertAllOfToModel(this.convertRefFromModel(body, false));
		result = this.convertSchemaTitles(result, 'schema');
		result = this.mapAdditionalProperties(result);
		if (bodyData.example) {
			result.example = jsonHelper.parse(bodyData.example);
			if (type && result.example[type]) {
				result.example = jsonHelper.parse(result.example[type]);
				if (result.example.hasOwnProperty('value')) {
					const value = {};
					value.value = result.example.value;
					result.example.value = value;
				}
			if(typeof result.example === 'object')
				result.example = this.fixValuesFormat(result.example);
			}
		}
		return result;
	}

	fixValuesFormat(object) {
		for (const id in object) {
			if (object.hasOwnProperty(id)) {
				const val = object[id];
				object[id] = RAML10Exporter.fixDateFormat(val);
				if (typeof val === 'object')
					object[id] = this.fixValuesFormat(val);
			}
		}
		return object;
	}

  static fixDateFormat(val) {
    if (typeof val === 'string' && ramlHelper.getRFC3339Format.test(val)) {
      if (val.match(/\d*Z/)[0].length > 3)
        return val.replace(/\d*Z/, val.match(/\d*Z/)[0].slice(0, 3) + 'Z');
    }
    return val;
  }

	mapRequestBodyForm(bodyData) {
		const body = {
			properties: bodyData.properties
		};
		
		/**
		 * Two different approaches to declare an optional parameter.
		 * source https://github.com/raml-org/raml-spec/blob/master/versions/raml-10/raml-10.md#property-declarations
		 * a) appending '?' to property name (without declaring required parameter).
		 * b) set required = false
		 */
		for (const i in body.properties) {
			if (!body.properties.hasOwnProperty(i)) continue;
			const property = body.properties[i];
			property.required = false;
			
			//facets
			RAMLExporter._addFacetsDeclaration(property, property);
		}
		
		if (bodyData.required && bodyData.required.length > 0) {
			for (const j in bodyData.required) {
				if (!bodyData.required.hasOwnProperty(j)) continue;
				const requiredParam = bodyData.required[j];
				if (body['properties'][requiredParam]) {
					body['properties'][requiredParam].required = true;
				}
			}
		}
		
		return body;
	}
	
	addSchema(ramlDef, schema) {
		ramlDef.types = schema;
	}
	
	convertAllOfToModel(object) {
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;
			
			const val = object[id];
			if (!val) continue;
			
			if (id == 'allOf') {
				object = this.convertAllOfAttribute(object);
			} else if (typeof val === 'object') {
				object[id] = this.convertAllOfToModel(val);
			}
		}
		
		return object;
	}
	
	convertAllOfAttribute(definition) {
		let result = {};
		const allOfTypes = [];
		if (!definition.allOf) return definition;
		
		for (const j in definition.allOf) {
			if (!definition.allOf.hasOwnProperty(j)) continue;
			const allOf = definition.allOf[j];
			if (allOf.properties) {
				result = this.mapSchemaProperties(allOf);
			} else if (allOf.type) {
				allOfTypes.push(allOf.type);
			}
		}
		
		result.type = allOfTypes.length > 1 ? allOfTypes : allOfTypes[0];
		delete result.allOf;
		
		return result;
	}
	
	mapSchema(slSchemas) {
		const results = {};
		for (const i in slSchemas) {
			if (!slSchemas.hasOwnProperty(i)) continue;
			const schema = slSchemas[i];
			let definition = this.convertRefFromModel(jsonHelper.parse(schema.Definition), true);
			definition = this.convertSchemaTitles(definition, 'schema');
			
			if (definition.allOf) {
				definition = this.convertAllOfToModel(definition);
			} else {
				if (definition.properties) {
					definition = this.mapSchemaProperties(definition);
				}
			}
			definition = this.mapAdditionalProperties(definition);
			
			if (definition.externalDocs) {
				definition['(oas-externalDocs)'] = definition.externalDocs;
				this.hasExternalDocs = true;
				delete definition.externalDocs;
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
				
				// const example = jsonHelper.parse(schema.example);
				// if (!_.isEmpty(example)) {
				// 	definition.example = example;
			}
			
			//check if schemaId contains invalid characters.
			const schemaId = stringHelper.checkAndReplaceInvalidChars(schema.NameSpace, ramlHelper.getValidCharacters, ramlHelper.getReplacementCharacter);
			if (schemaId !== schema.NameSpace) {
				this.hasDefinitionName = true;
				definition['(oas-definition-name)'] = schema.NameSpace;
			}
			results[schemaId] = definition;
		}
		return results;
	}
	
	mapSchemaProperties(definition) {
		this.convertRequiredFromProperties(definition);
		
		if (definition.properties && definition.type == 'object') {
			delete definition.type;
		}
		
		return definition;
	}
	
	mapAdditionalProperties(definition, insideProperties) {
		for (const key in definition) {
			if (!definition.hasOwnProperty(key)) continue;
			let val = definition[key];
			if (key === 'additionalProperties' && !insideProperties) {
				const hasObjectType = definition.type === 'object';
				const hasProperties = definition.hasOwnProperty('properties');
				if ((typeof val !== 'object' && val) || (!val && !hasObjectType && !hasProperties)) {
					delete definition.additionalProperties;
				} else if (typeof val === 'object') {
					if (!hasProperties) definition.properties = {};
					definition.properties['//'] = val;
					delete definition.additionalProperties;
				}
			} else if (typeof val === 'object') {
				val = this.mapAdditionalProperties(val, key === 'properties' && !insideProperties);
			}
		}
		
		return definition;
	}
	
	description(ramlDef, project) {
		ramlDef.description = project.Description;
	}
	
	getApiKeyType() {
		return 'Pass Through';
	}
	
	mapSecuritySchemes(securitySchemes) {
		return securitySchemes;
	}
	
	setMethodDisplayName(method, displayName) {
		if (displayName) {
			method.displayName = displayName;
		}
	}
	
	initializeTraits() {
		return {};
	}
	
	addTrait(id, trait, traits) {
		traits[_.camelCase(id)] = trait;
	}
}

module.exports = RAML10Exporter;
