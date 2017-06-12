const _ = require('lodash');
const Trait = require('../model/trait');
const Converter = require('../model/converter');
const Oas20MethodConverter = require('../oas20/Oas20MethodConverter');

class Oas20TraitConverter extends Converter {
	
	constructor(model, dereferencedAPI) {
		super(model);
		this.dereferencedAPI = dereferencedAPI;
	}
	
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
				if (!paramResult.hasParams) paramsResult[paramResult.name] = paramResult;
			}
		}
		const responsesResult = {};
		if (methodResult.hasOwnProperty('responses')) {
			for (const id in methodResult.responses) {
				if (!methodResult.responses.hasOwnProperty(id)) continue;
				
				const responseResult = methodResult.responses[id];
				if (!responseResult.hasParams && (responseResult.hasOwnProperty('schema') || responseResult.hasOwnProperty('headers') || !_.isEmpty(responseResult.description)))
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
			if (oasDef.in === 'path') continue;
			const traitName = Oas20TraitConverter.getTraitName(id);
			if (!traitNames.includes(traitName)) {
				traits[traitName] = { parameters: [oasDef] };
				traitNames.push(traitName);
			} else {
				const parameters = traits[traitName].parameters;
				parameters.push(oasDef);
			}
		}
		
		for (const id in traits) {
			if (!traits.hasOwnProperty(id)) continue;
			
			const model = new Trait();
			model.name = id;
			this.currentParam = id;
			model.method = this._import(traits[id]);
			result.push(model);
		}
		
		return result;
	}
	
	// imports 1 trait definition
	_import(oasDef) {
		const methodConverter = new Oas20MethodConverter(this.model, this.dereferencedAPI[this.currentParam]);
		
		const result = methodConverter._import({ parameters: oasDef.parameters });
		if (result.hasOwnProperty('is')) delete result.is;
		
		return result;
	}
	
	static getTraitName(fullName) {
		const index = fullName.indexOf(':');
		return index < 0 ? fullName : fullName.substring(index + 1, fullName.lastIndexOf(':'))
	}
	
}

module.exports = Oas20TraitConverter;