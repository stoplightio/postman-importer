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
				this.addDefinitions(schema, this.data.schemas);
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

	static convertObjectProperty(source) {
		const target = Object.assign({}, source);
		target.properties = {};
		target.required = source.hasOwnProperty('required') && _.isArray(source.required)? source.required: [];

		for (const paramName in source.properties) {
			if (!source.properties.hasOwnProperty(paramName)) continue;
			let parameter = source.properties[paramName];
			const param = _.isArray(parameter)? parameter[0] : parameter;
			target.properties[paramName] = param;

			if (param.properties && !_.isEmpty(param.properties)) {
				target.properties[paramName] = RAML08Importer.convertObjectProperty(param);
			} else if (paramName === 'items' && typeof param === 'object'){
				target[paramName] = RAML08Importer.convertObjectProperty(param);
			} else if (param.hasOwnProperty('required')){
				//required
				if (param.required === true && target.required.indexOf(paramName) < 0) {
					target['required'].push(paramName);
				}
				delete param.required;
			}
		}
		if (target.required && target.required.length == 0) {
			delete target.required;
		}
		if (target.properties && _.isEmpty(target.properties)) {
			delete target.properties;
		}
		return target;
	}

	_mapSchema(definition, isSchema) {
		definition = jsonHelper.parse(definition);
		if (definition.properties && !_.isEmpty(definition.properties)) {
			definition = RAML08Importer.convertObjectProperty(definition);
		}

		for (const id in definition) {
			if (!definition.hasOwnProperty(id)) continue;
			let val = definition[id];
			if (id === 'items') {
				if (_.isArray(val) && val.length == 0)
					definition[id] = {type: 'string'};
				else if (!_.isArray(val) && typeof val === 'object')
					definition[id] = this._mapSchema(val);
			}
			if (id === 'type') {
				if (_.isArray(val)){
					if (val.length == 1)
						val = val[0];
					else if (val.length == 0){
						definition[id] = 'array';
						definition['items'] = {type : 'string'};
						val = 'array';
					}
				}
				if (typeof val === 'string' && val != 'object' && ramlHelper.getRAML08ScalarTypes.indexOf(val) < 0) {
					definition[RAMLImporter.getCustomProperty('type')] = val;
					definition.type = 'string';
				}
				if (typeof val === 'string' && val ==='array' && !definition.hasOwnProperty('items'))
					definition['items'] = {type: 'string'};
			} else if (typeof val === 'object') {
				this._mapSchema(val, isSchema);
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
