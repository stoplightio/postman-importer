const _ = require('lodash');
const RAMLExporter = require('./baseraml');
const jsonHelper = require('../utils/json');

class RAML08Exporter extends RAMLExporter {
	constructor() {
		super();
	}
	
	version() {
		return '0.8';
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
		
		return mediaTypes.length ? mediaTypes[0] : null;
	}
	
	mapAuthorizationGrants(flow) {
		let ag = [];
		switch (flow) {
		case 'implicit':
			ag = ['token'];
			break;
		case 'password':
			ag = ['credentials'];
			break;
		case 'application':
			ag = ['owner'];
			break;
		case 'accessCode':
			ag = ['code'];
			break;
		}
		return ag;
	}
	
	mapRequestBodyForm(bodyData) {
		const body = {
			formParameters: bodyData.properties
		};
		if (bodyData.required && bodyData.required.length > 0) {
			for (const i in bodyData.required) {
				if (!bodyData.required.hasOwnProperty(i)) continue;
				const requiredParam = bodyData.required[i];
				if (body['formParameters'][requiredParam]) {
					body['formParameters'][requiredParam].required = true;
				}
			}
		}
		
		return body;
	}
	
	mapBody(bodyData, ramlDef) {
		const body = {
			schema: jsonHelper.format(this.convertRefFromModel(jsonHelper.parse(bodyData.body), false, null, ramlDef))
		};
		
		const example = jsonHelper.format(bodyData.example);
		if (!_.isEmpty(example)) {
			body.example = example;
		}
		
		return body;
	}
	
	addSchema(ramlDef, schema) {
		ramlDef.schemas = schema;
	}
	
	mapSchema(slSchemas) {
		const results = [];
		for (const i in slSchemas) {
			if (!slSchemas.hasOwnProperty(i)) continue;
			const schema = slSchemas[i];
			const resultSchema = {};
			resultSchema[schema.NameSpace] = jsonHelper.format(schema.Definition);
			results.push(resultSchema);
		}
		return results;
	}
	
	description(ramlDef, project) {
		ramlDef.documentation = [{
			title: project.Name,
			content: project.Description
		}];
	}
	
	getApiKeyType() {
		return 'x-api-key';
	}
	
	mapSecuritySchemes(securitySchemes) {
		return _.map(securitySchemes, function (v, k) {
			const m = {};
			m[k] = v;
			return m;
		});
	}
	
	setMethodDisplayName() {
	}
	
	initializeTraits() {
		return [];
	}
	
	addTrait(id, trait, traits) {
		const newTrait = {};
		newTrait[_.camelCase(id)] = trait;
		traits.push(newTrait);
	}
}

module.exports = RAML08Exporter;
