const _ = require('lodash');
const Method = require('../model/method');
const Response = require('../model/response');
const Parameter = require('../model/parameter');
const Body = require('../model/body');
const Converter = require('../model/converter');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');

class Raml10MethodConverter extends Converter {
	
	export(models) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		models.map(model => {
			result[model.method] = this._export(model);
		});
		
		return result;
	}
	
	// exports 1 method definition
	_export(model) {
		const attrIdMap = {
			'name': 'displayName'
		};

		const attrIdSkip = ['responses', 'headers', 'bodies', 'method'];
		const ramlDef = Raml10MethodConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);
		const raml10DefinitionConverter = new Raml10DefinitionConverter();
		
		if (model.hasOwnProperty('responses')) {
			if (_.isArray(model.responses) && !_.isEmpty(model.responses)) {
				const responses = {};
				for (const index in model.responses) {
					if (!model.responses.hasOwnProperty(index)) continue;
					
					const val = model.responses[index];
					if (val.hasOwnProperty('httpStatusCode') && val.httpStatusCode != 'default') {
						const response = {};
						if (val.hasOwnProperty('description')) response.description = val.description;
						const body = Raml10MethodConverter.exportBodies(val, raml10DefinitionConverter);
						if (!_.isEmpty(body)) response.body = body;
						responses[val.httpStatusCode] = response;
					}
				}
				if (!_.isEmpty(responses)) ramlDef.responses = responses;
			}
		}
		if (model.hasOwnProperty('headers')) {
			if (_.isArray(model.headers) && !_.isEmpty(model.headers)) {
				const headers = {};
				for (const index in model.headers) {
					if (!model.headers.hasOwnProperty(index)) continue;
					
					const val = model.headers[index];
					headers[val.name] = raml10DefinitionConverter._export(val.definition);
				}
				ramlDef.headers = headers;
			}
		}
		const body = Raml10MethodConverter.exportBodies(model, raml10DefinitionConverter);
		if (!_.isEmpty(body)) ramlDef.body = body;
		
		return ramlDef;
	}
	
	static exportBodies(object, converter) {
		const body = {};
		if (object.hasOwnProperty('bodies')) {
			if (_.isArray(object.bodies) && !_.isEmpty(object.bodies)) {
				for (const index in object.bodies) {
					if (!object.bodies.hasOwnProperty(index)) continue;
					
					const val = object.bodies[index];
					body[val.mimeType] = converter._export(val.definition)
				}
			}
		}
		return body;
	}
	
	static copyObjectFrom(object, attrIdMap, attrIdSkip) {
		const result = new Method();
		
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;
			
			if (attrIdSkip.indexOf(id) < 0) {
				result[attrIdMap.hasOwnProperty(id) ? attrIdMap[id] : id] = object[id];
			}
		}
		
		return result;
	}

	import(ramlDefs) {
		let result = [];
		if (_.isEmpty(ramlDefs)) return result;
		
		for (const id in ramlDefs) {
			if (!ramlDefs.hasOwnProperty(id)) continue;
			
			const ramlDef = ramlDefs[id];
			result.push(this._import(ramlDef));
		}
		return result;
	}

	// imports 1 method definition
	_import(ramlDef) {
		const attrIdMap = {
			'displayName': 'name'
		};

		const attrIdSkip = ['responses', 'headers', 'body'];
		const model = Raml10MethodConverter.copyObjectFrom(ramlDef, attrIdMap, attrIdSkip);
		const raml10DefinitionConverter = new Raml10DefinitionConverter();
		
		if (ramlDef.hasOwnProperty('responses')) {
			const responses = [];
			for (const id in ramlDef.responses) {
				if (!ramlDef.responses.hasOwnProperty(id)) continue;
				
				const value = ramlDef.responses[id];
				let response = new Response();
				response.httpStatusCode = id;
				if (value.hasOwnProperty('description')) response.description = value.description;
				response.bodies = Raml10MethodConverter.importBodies(value, raml10DefinitionConverter);
				responses.push(response);
			}
			model.responses = responses;
		}
		if (ramlDef.hasOwnProperty('headers')) {
			const headers = [];
			for (const id in ramlDef.headers) {
				if (!ramlDef.headers.hasOwnProperty(id)) continue;
				
				const value = ramlDef.headers[id];
				let header = new Parameter();
				header.name = id;
				header.definition = raml10DefinitionConverter._import(value);
				headers.push(header);
			}
			model.headers = headers;
		}
		model.bodies = Raml10MethodConverter.importBodies(ramlDef, raml10DefinitionConverter);
		
		return model;
	}
	
	static importBodies(object, converter) {
		const bodies = [];
		if (object.hasOwnProperty('body')) {
			for (const id in object.body) {
				if (!object.body.hasOwnProperty(id)) continue;
				
				const body = new Body();
				body.mimeType = id;
				body.definition = converter._import(object.body[id]);
				bodies.push(body);
			}
		}
		return bodies;
	}
	
}

module.exports = Raml10MethodConverter;