const RAMLImporter = require('./baseraml'),
	Schema = require('../entities/schema'),
	jsonHelper = require('../utils/json'),
	_ = require('lodash');

class RAML10Importer extends RAMLImporter {
	constructor() {
		super();
	}
	
	mapRequestBody(methodBody, checkEmptyType, mimeType) {
		const data = {mimeType: ''};
		
		if (checkEmptyType) {
			RAMLImporter._fillDefaultType(methodBody);
		}
		
		data.mimeType = mimeType;
		if (methodBody.description) {
			data.description = methodBody.description;
			delete methodBody.description;
		}
		
		if (methodBody.properties && !_.isEmpty(methodBody.properties)) {
			switch (data.mimeType) {
				case 'application/json':
					data.body = this._mapSchema(methodBody, true);
					// data.body = RAML10Importer.convertObjectProperty(mimeType);
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
					const formParams = methodBody.properties;
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
		else if (RAML10Importer.isArray(methodBody)) {
			data.body = this.convertRefToModel(this.convertArray(methodBody), false);
		}
		else if (methodBody.schema && !_.isEmpty(methodBody.schema)) {
			let schema = _.isArray(methodBody.schema)? methodBody.schema[0] : methodBody.schema;
			if (typeof schema !== "object")
				schema = jsonHelper.parse(schema);

			if (schema.hasOwnProperty('definitions')) {
				this.data.types = _.concat(this.data.types, schema.definitions);
				delete schema.definitions;
			}

			data.body = this._mapSchema(this.convertRefToModel({
				type: schema
			}, false),false);
		}
		else if (methodBody.type && !_.isEmpty(methodBody.type) && methodBody.type[0] !== 'object') {
			data.body = this._mapSchema(methodBody, false);
			// data.body = RAMLImporter.convertRefToModel({
			// 	type: mimeType.type[0]
			// });
		}
		
		return data;
	}

	convertArrayTypeExpression(param){
		let valid = true;
		let result = {};
		let types = [];

		for (let i= 0; i < param.length; i++){
			const key = param[i];
			if (typeof key === 'object'){
				if (key.hasOwnProperty('type') && typeof key.type[0] === 'string' && this.isValidRefValue(key.type[0])){
					types.push(key.type[0]);
				}else{
					valid = false;
					break;
				}
			}
		}
		if (valid){
			result['name'] = param[0].name;
			result['type'] = types;
			result['typePropertyKind'] = 'TYPE_EXPRESSION';
			return result;
		}
		return param;
	}

	convertObjectProperty(source) {
		const target = Object.assign({}, source);
		target.properties = {};
		if(source.type !== 'array')
			target.type = 'object';
		target.required = [];

		if (source.description) {
			target.description = jsonHelper.stringify(source.description);
		}
		
		for (const paramName in source.properties) {
			let skipRequired = false;
			if (!source.properties.hasOwnProperty(paramName)) continue;
			let parameter = source.properties[paramName];
			let param = _.isArray(parameter)? this.convertArrayTypeExpression(parameter) : parameter;

			if (RAML10Importer.isArray(param)) {
				target.properties[paramName] = this.convertArray(param);
			}
			else if (RAML10Importer.isFacet(param)) { //check for facets
				target.properties[paramName] = RAML10Importer.convertFacet(param);
			}
			else if (RAML10Importer.isAdditionalProperties(param)) {
				RAML10Importer.convertAdditionalProperties(target, param);
				skipRequired = true;
			}
			else {
				if (_.isArray(param.type) && param.type.length > 1) {
					RAML10Importer._removeHarmlessChars(param.type);
					RAML10Importer._modifyUnionTypeDef(param);
					param.allOf = param.type;
					delete param.type;
				}
				if (!_.isArray(param.type) && typeof param.type === 'object') {
					param.type = this._mapSchema(param.type);
					param = this.mapObjectType(param);
				}
				target.properties[paramName] = param;
			}
			if (skipRequired) continue;
			
			//add annotations
			RAMLImporter._addAnnotations(param, target.properties[paramName]);
			
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

		// RAMLImporter.convertRefToModel(target);
		
		return target;
	}

	mapObjectType(param) {
		let type = param.type;
		const mergeFacets = ['properties','required'];
		for (const id in type) {
			if (!type.hasOwnProperty(id)) continue;
			let val = type[id];
			param[id] = ((mergeFacets.indexOf(id) > -1) && param.hasOwnProperty(id))? _.concat(param[id],val): val;
		}
		return param;
	}
	
	_mapSchema(definition, isSchema) {
		let properties = null;
		let result = definition;
		
		if (definition.properties && !_.isEmpty(definition.properties)) {
			properties = this.convertObjectProperty(definition);
		}
		
		if (definition.hasOwnProperty('type') && definition.type != 'object') { //type
			if (_.isArray(definition.type)) {
				RAML10Importer._removeHarmlessChars(definition.type); //remove ( and )
				RAML10Importer._modifyUnionTypeDef(definition);
			}
			
			if (properties) { //type and properties
				result.allOf = definition.type;
				result.allOf.push(properties);
				delete result.type;
				delete result.properties;
			} else {
				result = this._convertCustomTypes(definition);
				if (_.isArray(definition.type) && definition.type.length > 1) {
					result.allOf = definition.type;
					delete result.type;
				}
				else { //definition.type is json string value. or type=object
					let jsonObject = jsonHelper.parse(_.isArray(definition.type) ? definition.type[0] : definition.type);
					if (typeof jsonObject === 'object') {
						jsonObject = this.convertObjectProperty(jsonObject);
						result = jsonObject;
					}
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
		RAMLImporter._addAnnotations(definition, result);
		result = this._convertCustomTypes(result);
		return this.convertRefToModel(result, isSchema);
	}

	isDefinedAsSchema(schemas, schemaId) {
		for (const index in schemas) {
			if (!schemas.hasOwnProperty(index)) continue;
			for (const schemaName in schemas[index]) {
				if (!schemas[index].hasOwnProperty(schemaName)) continue;
				if (schemaName === schemaId) return true;
			}
		}
		return false;
	}

	mapSchemas(schemData) {
		const schemas = [];
		for (const index in schemData) {
			if (!schemData.hasOwnProperty(index)) continue;
			for (const schemaName in schemData[index]) {
				if (!schemData[index].hasOwnProperty(schemaName)) continue;
				const sd = new Schema(schemaName);
				sd.Name = schemaName;
				sd.Definition = this._mapSchema(schemData[index][schemaName], true);
				
				schemas.push(sd);
			}
		}
		return schemas;
	}
	
	_convertCustomTypes(result) {
		if (RAML10Importer.isArray(result)) { //check for array
			//convert array
			result = this.convertArray(result);
		}
		else if (RAML10Importer.isFacet(result)) { //check for facets
			result = RAML10Importer.convertFacet(result);
		}
		else if (RAML10Importer.isFixedFacet(result)) {
			result = RAML10Importer.convertFixedFacet(result);
		}
		return result;
	}
	
	static _modifyUnionTypeDef(definition) {
		const type = definition.type;
		
		if (type.length > 1) {
			definition[RAMLImporter.getCustomProperty('union-type-definition')] = '[' + _.join(type, ',') + ']';
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
	
	convertArray(definition) {
		if (definition.hasOwnProperty('items')) {
			if (definition.items.hasOwnProperty('type')) {
				definition.items.type = _.isArray(definition.items.type) ? definition.items.type[0] : definition.items.type;
				if (definition.items.type === 'object' && definition.items.hasOwnProperty('properties'))
					definition['items']= this.convertObjectProperty(definition.items);
			}
			else {
				const items = definition.items;
				if (RAML10Importer.isRamlArray(items)) {
					definition.items = this.convertArray(RAML10Importer.convertRamlArray(definition.items));
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
	
	static convertAdditionalProperties(target, definition) {
		const type = definition.type;
		const pattern = definition.name;
		let info = {};
		if (_.isArray(type) && type.length == 1) {
			info.type = type[0];
		}
		if (pattern !== '//') {
			info.pattern = pattern;
		}
		
		if (info.hasOwnProperty('pattern')) {
			if (!target.hasOwnProperty('additionalProperties')) {
				target.additionalProperties = {};
				target.additionalProperties[RAMLImporter.getCustomProperty('additional-properties-info')] = [];
			}
			if (!target.additionalProperties.type) target.additionalProperties.type = info.type;
			else target.additionalProperties.type = 'object';
			target.additionalProperties[RAMLImporter.getCustomProperty('additional-properties-info')].push(info);
		} else {
			target.additionalProperties = {};
			target.additionalProperties.type = info.type;
		}
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
		definition[RAMLImporter.getCustomProperty('facets')] = result;
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
				definition[RAMLImporter.getCustomProperty('facets-' + key)] = fixedFacets[key];
			}
		}
		delete definition.fixedFacets;
		
		return definition;
	}
	
	//noinspection JSMethodCanBeStatic
	getSchemas(data) {
		return data.types || data.schemas;
	}

	mapAuthorizationGrants(oauth, flow) {
		switch (flow) {
			case 'authorization_code':
				oauth.flow = 'accessCode';
				break;
			case 'implicit':
				oauth.flow = 'implicit';
				break;
			case 'client_credentials':
				oauth.flow = 'application';
				break;
			case 'password':
				oauth.flow = 'password';
				break;
		}
		return oauth;
	}
	
	description(project, data) {
		if (data.description) {
			project.Description = data.description;
		}
	}
}
module.exports = RAML10Importer;
