const RAMLImporter = require('./baseraml'),
	Schema = require('../entities/schema'),
	jsonHelper = require('../utils/json'),
	Text = require('../entities/text');

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
			data.body = RAMLImporter.convertRefToModel(jsonHelper.parse(methodBody.schema));
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
				sd.Definition = jsonHelper.cleanSchema(schemData[i][schemaName]);
				schemas.push(sd);
			}
		}
		return schemas;
	}
	
	//noinspection JSMethodCanBeStatic
	getSchemas(data) {
		return data.schemas;
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
				this.project.addText(txt);
			}
		}
	}
}
module.exports = RAML08Importer;
