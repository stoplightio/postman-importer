const RAMLImporter = require('./baseraml'),
	Schema = require('../entities/schema'),
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
			data.body = RAMLImporter.convertRefToModel(jsonHelper.parse(methodBody.schema), false);
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
	
	mapSchemas(schemData) {
		const schemas = [];
		for (const i in schemData) {
			if (!schemData.hasOwnProperty(i)) continue;
			
			for (const schemaName in schemData[i]) {
				if (!schemData[i].hasOwnProperty(schemaName)) continue;
				
				const sd = new Schema(schemaName);
				sd.Name = schemaName;
				let definition = RAML08Importer._mapSchema(schemData[i][schemaName], true);
				sd.Definition = jsonHelper.cleanSchema(definition);
				schemas.push(sd);
			}
		}
		return schemas;
	}
	
	static _mapSchema(definition, isSchema) {
		definition = jsonHelper.parse(definition);
		for (const id in definition) {
			if (!definition.hasOwnProperty(id)) continue;
			let val = definition[id];
			if (id === 'items') {
				if (_.isArray(val) && val.length == 0)
					definition[id] = {type: 'string'};
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
					definition['x-raml-type'] = val;
					definition.type = 'string';
				}
				if (typeof val === 'string' && val ==='array' && !definition.hasOwnProperty('items'))
					definition['items'] = {type: 'string'};
			} else if (typeof val === 'object') {
				RAML08Importer._mapSchema(val, isSchema);
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
