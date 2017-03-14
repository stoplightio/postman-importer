const RAMLImporter = require('./baseraml'),
	jsonHelper = require('../utils/json'),
	ramlHelper = require('../helpers/raml'),
	Text = require('../entities/text'),
	_ = require('lodash');

class RAML08Importer extends RAMLImporter {
	constructor() {
		super();
	}
	
	mapRequestBody(methodBody, checkEmptyType, mimeType) {
		const data = {mimeType: '', body: {}, example: ''};
		
		data.mimeType = mimeType;
		if (methodBody.example) {
			data.example = methodBody.example;
		}
		
		if (methodBody.schema) {
			const schema = jsonHelper.parse(methodBody.schema);
			if (schema.hasOwnProperty('definitions')) {
				this.data.schemas = this.addDefinitions(schema, this.data.schemas);
				methodBody.schema = jsonHelper.stringify(schema)
			}

			data.body = this._mapSchema(this.convertRefToModel(jsonHelper.parse(methodBody.schema), false));
		} else if (methodBody.formParameters) {
			data.body = {
				type: 'object',
				'properties': {},
				'required': []
			};
			const formParams = methodBody.formParameters;
			for (const j in formParams) {
				if (!formParams.hasOwnProperty(j)) continue;
				const param = formParams[j];
				
				data.body.properties[param.name] = {
					type: param.type
				};
				if (param.description) {
					data.body.properties[param.name].description = param.description;
				}
				if (param.required) {
					data.body.required.push(param.name);
				}
			}
		}
		
		return data;
	}

	isDefinedAsSchema(schemas, schemaId) {
		for (const i in schemas) {
			if (!schemas.hasOwnProperty(i)) continue;

			for (const schemaName in schemas[i]) {
				if (!schemas[i].hasOwnProperty(schemaName)) continue;
				if (schemaName === schemaId) return true;
			}
		}
		return false;
	}

	static convertObjectProperty(object, isProperty) {
		object.required = object.hasOwnProperty('required') && _.isArray(object.required)? object.required: [];

		if (object.hasOwnProperty('properties') && !isProperty) {
			let properties = {};
			for (const paramName in object.properties) {
				if (!object.properties.hasOwnProperty(paramName)) continue;
				let parameter = object.properties[paramName];
				const param = _.isArray(parameter)? parameter[0] : parameter;
				properties[paramName] = param;
				if (param.hasOwnProperty('required') && typeof param.required === 'boolean'){
					//required
					if (param.required && !object.required.includes(paramName)) {
						object.required.push(paramName);
					}
					delete param.required;
				}
				if (param.hasOwnProperty('properties') && !_.isEmpty(param.properties)) {
					RAML08Importer.convertObjectProperty(properties[paramName], false);
				}
				if (param.hasOwnProperty('items') && !_.isEmpty(param.items)) {
					RAML08Importer.convertObjectProperty(properties[paramName].items, false);
				}
			}
		}
		if (object.items && !isProperty && object.items.hasOwnProperty('properties')) {
			RAML08Importer.convertObjectProperty(object.items, false);
		}
		if (object.required.length == 0) {
			delete object.required;
		}
	}

	_mapSchema(definition, isSchema, isProperty) {
		if (typeof definition === 'string') definition = jsonHelper.parse(definition);
		if (typeof definition === 'string') return definition;
		RAML08Importer.convertObjectProperty(definition);

		for (const id in definition) {
			if (!definition.hasOwnProperty(id)) continue;
			let val = definition[id];
			if (!isProperty) {
				if (id === 'items') {
					if (_.isArray(val) && val.length == 0) {
						definition[id] = {type: 'string'};
					} else if (_.isArray(val) || val.hasOwnProperty('0')) {
						for (const key in val) {
							if (!val.hasOwnProperty(key)) continue;
							definition[id][key] = this._mapSchema(val[key], isSchema, false);
						}
					} else {
						definition[id] = this._mapSchema(val, isSchema, false);
					}
				}
				else if (id === 'type') {
					if (_.isArray(val)) {
						if (val.length == 1)
							val = val[0];
						else if (val.length == 0) {
							definition[id] = 'array';
							definition['items'] = {type: 'string'};
							val = 'array';
						}
					}
					if (typeof val === 'string' && val != 'object' && ramlHelper.getRAML08ScalarTypes.indexOf(val) < 0) {
						definition[RAMLImporter.getCustomProperty('type')] = val;
						definition.type = 'string';
					}
					if (typeof val === 'string' && val === 'array' && !definition.hasOwnProperty('items')) {
						definition['items'] = {type: 'string'};
					}
				} else if (id === 'properties') {
					definition[id] = this._mapSchema(val, isSchema, !isProperty);
				}
			}
			else {
				definition[id] = this._mapSchema(val, isSchema, false)
			}
		}
		return definition;
	}
	
	//noinspection JSMethodCanBeStatic
	getSchemas(data) {
		return data.schemas;
	}

	mapAuthorizationGrants(oauth, flow) {
		switch (flow) {
			case 'code':
				oauth.flow = 'accessCode';
				break;
			case 'token':
				oauth.flow = 'implicit';
				break;
			case 'credentials':
				oauth.flow = 'application';
				break;
			case 'owner':
				oauth.flow = 'password';
				break;
		}
		return oauth;
	}

	description(project, data) {
		const documentation = data.documentation;
		if (documentation && documentation.length > 0) {
			project.Description = documentation[0].content;
			project.Environment.summary = documentation[0].content;
		}
		
		// text sections
		if (documentation) {
			for (const i in documentation) {
				if (!documentation.hasOwnProperty(i)) continue;
				const doc = documentation[i];
				const txt = new Text(doc.title);
				txt.Public = true;
				txt.Content = doc.content;
				project.addText(txt);
			}
		}
	}
}
module.exports = RAML08Importer;
