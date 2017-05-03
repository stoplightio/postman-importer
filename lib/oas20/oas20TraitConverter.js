const _ = require('lodash');
const Trait = require('../model/trait');
const Response = require('../model/response');
const Body = require('../model/body');
const Converter = require('../model/converter');
const Oas20DefinitionConverter = require('../oas20/Oas20DefinitionConverter');
const Oas20MethodConverter = require('../oas20/Oas20MethodConverter');

class Oas20TraitConverter extends Converter {
	
	export(models) {
		if (_.isEmpty(models)) return {};
		
		const traits = {};
		models.map(model => {
			traits[model.name] = this._export(model.method);
		});
		
		const paramsResult = {};
		const responsesResult = {};
		for (const id in traits) {
			if (!traits.hasOwnProperty(id)) continue;
			
			const trait = traits[id];
			for (const index in trait.parameters) {
				if (!trait.parameters.hasOwnProperty(index)) continue;
				
				const param = trait.parameters[index];
				const name = 'trait:' + id + ':' + index;
				paramsResult[name] = param;
			}
			for (const index in trait.responses) {
				if (!trait.responses.hasOwnProperty(index)) continue;
				
				const param = trait.responses[index];
				const name = 'trait:' + id + ':' + index;
				responsesResult[name] = param;
			}
		}
		
		return {
			parameters: paramsResult,
			responses: responsesResult
		};
	}
	
	// exports 1 trait definition
	_export(model) {
		const methodConverter = new Oas20MethodConverter();
		
		const methodResult = methodConverter._export(model);
		const paramsResult = {};
		if (methodResult.hasOwnProperty('parameters')) {
			for (const id in methodResult.parameters) {
				if (!methodResult.parameters.hasOwnProperty(id)) continue;
				
				const paramResult = methodResult.parameters[id];
				if (paramResult.hasOwnProperty('example')) delete paramResult.example;
				paramsResult[paramResult.name] = paramResult;
			}
		}
		const responsesResult = {};
		if (methodResult.hasOwnProperty('responses')) {
			for (const id in methodResult.responses) {
				if (!methodResult.responses.hasOwnProperty(id)) continue;
				
				const responseResult = methodResult.responses[id];
				if (responseResult.hasOwnProperty('schema') || responseResult.hasOwnProperty('headers') || !_.isEmpty(responseResult.description))
					responsesResult[id] = methodResult.responses[id];
			}
		}
		
		return {
			parameters: paramsResult,
			responses: responsesResult
		};
	}
	
	static copyObjectFrom(object, attrIdMap, attrIdSkip) {
		const result = new Trait();
		
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;
			
			if (attrIdSkip.indexOf(id) < 0) {
				result[attrIdMap.hasOwnProperty(id) ? attrIdMap[id] : id] = object[id];
			}
		}
		
		return result;
	}
	
	import(oasDefs) {
		const result = [];
		if (_.isEmpty(oasDefs)) return result;
		
		
		const traits = {};
		let traitNames = [];
		for (const id in oasDefs.parameters) {
			if (!oasDefs.parameters.hasOwnProperty(id)) continue;
			
			const oasDef = oasDefs.parameters[id];
			const traitName = Oas20TraitConverter.getTraitName(id);
			if (!traitNames.includes(traitName)) {
				traits[traitName] = { parameters: [oasDef] };
				traitNames.push(traitName);
			} else {
				const parameters = traits[traitName].parameters;
				parameters.push(oasDef);
			}
		}
		traitNames = [];
		for (const id in oasDefs.responses) {
			if (!oasDefs.responses.hasOwnProperty(id)) continue;
			
			const oasDef = oasDefs.responses[id];
			oasDef.code = Oas20TraitConverter.getResponseCode(id);
			const traitName = Oas20TraitConverter.getTraitName(id);
			if (!traitNames.includes(traitName)) {
				if (!traits.hasOwnProperty(traitName)) traits[traitName] = {};
				traits[traitName].responses = [oasDef];
				traitNames.push(traitName);
			} else {
				const parameters = traits[traitName].responses;
				parameters.push(oasDef);
			}
		}
		
		for (const id in traits) {
			if (!traits.hasOwnProperty(id)) continue;
			
			const model = new Trait();
			model.name = id;
			model.method = this._import(traits[id]);
			result.push(model);
		}
		
		return result;
	}
	
	// imports 1 trait definition
	_import(oasDef) {
		const methodConverter = new Oas20MethodConverter();
		const definitionConverter = new Oas20DefinitionConverter();
		
		const result = methodConverter._import({ parameters: oasDef.parameters	});
		if (oasDef.hasOwnProperty('responses') && !_.isEmpty(oasDef.responses)) {
			const responses = [];
			for (const id in oasDef.responses) {
				if (!oasDef.responses.hasOwnProperty(id)) continue;
				
				const response = oasDef.responses[id];
				const responseModel = new Response();
				responseModel.httpStatusCode = response.code;
				if (response.hasOwnProperty('description')) responseModel.description = response.description;
				const bodyModel = new Body();
				bodyModel.mimeType = 'application/json';
				bodyModel.definition = definitionConverter._import(response.schema);
				responseModel.bodies = [bodyModel];
				responses.push(responseModel);
			}
			result.responses = responses;
		}
		
		return result;
	}
	
	static getTraitName(fullName) {
		return fullName.substring(fullName.indexOf(':') + 1, fullName.lastIndexOf(':'))
	}
	
	static getResponseCode(fullName) {
		return fullName.substring(fullName.lastIndexOf(':') + 1)
	}
	
}

module.exports = Oas20TraitConverter;