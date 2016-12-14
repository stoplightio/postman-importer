const RAML = require('./baseraml'),
	Schema = require('../entities/schema'),
	jsonHelper = require('../utils/json'),
	Text = require('../entities/text');

class RAML08 extends RAML {
	constructor() {
		super();
	}
	
	mapRequestBody(methodBody) {
		let data = {mimeType: '', body: {}, example: ''};
		
		//TODO: only one, the latest is in effect in stoplight!
		for (let i in methodBody) {
			if (!methodBody.hasOwnProperty(i)) continue;
			let mimeType = methodBody[i];
			
			data.mimeType = mimeType.name;
			if (mimeType.example) {
				data.example = mimeType.example;
			}
			
			if (mimeType.schema) {
				data.body = this.convertRefToModel(jsonHelper.parse(mimeType.schema));
			} else if (mimeType.formParameters) {
				data.body = {
					type: 'object',
					'properties': {},
					'required': []
				};
				let formParams = mimeType.formParameters;
				for (let j in formParams) {
					if (!formParams.hasOwnProperty(j)) continue;
					let param = formParams[j];
					
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
		}
		
		return data;
	}
	
	mapSchema(schemData) {
		let schemas = [];
		for (let i in schemData) {
			if (!schemData.hasOwnProperty(i)) continue;
			
			for (let schemaName in schemData[i]) {
				if (!schemData[i].hasOwnProperty(schemaName)) continue;
				
				let sd = new Schema(schemaName);
				sd.Name = schemaName;
				sd.Definition = jsonHelper.cleanSchema(schemData[i][schemaName]);
				schemas.push(sd);
			}
		}
		return schemas;
	}
	
	//noinspection JSMethodCanBeStatic
	getSchema(data) {
		return data.schemas;
	}
	
	description(project, data) {
		let documentation = data.documentation;
		if (documentation && documentation.length > 0) {
			project.Description = documentation[0].content;
			project.Environment.summary = documentation[0].content;
		}
		
		// text sections
		if (documentation) {
			for (let i in documentation) {
				if (!documentation.hasOwnProperty(i)) continue;
				let doc = documentation[i];
				let txt = new Text(doc.title);
				txt.Public = true;
				txt.Content = doc.content;
				this.project.addText(txt);
			}
		}
	}
}
module.exports = RAML08;
