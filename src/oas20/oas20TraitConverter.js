// @flow
const _ = require('lodash');
const ConverterModel = require('oas-raml-converter-model');
const Trait = ConverterModel.Trait;
const Method = ConverterModel.Method;
const Converter = require('../converters/converter');
const Oas20MethodConverter = require('../oas20/oas20MethodConverter');

class Oas20TraitConverter extends Converter {
	
	constructor(model:any, dereferencedAPI:any) {
		super(model);
		this.dereferencedAPI = dereferencedAPI;
	}
	
	export(models:Trait[]) {
		if (_.isEmpty(models)) return {};
		
		const traits = {};
		for (let i = 0; i < models.length; i++) {
			const model: Trait = models[i];
			const method: ?Method = model.method;
			if (method) traits[model.name] = this._export(method);
		}
		
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
	_export(model:Method) {
		const methodConverter = new Oas20MethodConverter(this.model, this.dereferencedAPI, '', this.def);
		
		const methodResult = methodConverter._export(model);
		const paramsResult = {};
		if (methodResult.hasOwnProperty('parameters')) {
			for (let i = 0; i < methodResult.parameters.length; i++) {
				const paramResult = methodResult.parameters[i];
				if (paramResult.hasOwnProperty('example')) delete paramResult.example;
				if (!paramResult.hasParams) paramsResult[paramResult.name] = paramResult;
			}
		}
		const responsesResult = {};
		if (methodResult.hasOwnProperty('responses')) {
			for (const id in methodResult.responses) {
				if (!methodResult.responses.hasOwnProperty(id)) continue;
				
				const responseResult = methodResult.responses[id];
				if (id !== 'default' && !responseResult.hasParams && (id !== 'default' || (responseResult.hasOwnProperty('schema') || responseResult.hasOwnProperty('headers') && !_.isEmpty(responseResult.description))))
					responsesResult[id] = methodResult.responses[id];
			}
		}
		
		return {
			parameters: paramsResult,
			responses: responsesResult
		};
	}
	
	import(oasDefs:any) {
		const result: Trait[] = [];
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
			const method: Method = this._import(traits[id]);
			model.method = method;
			result.push(model);
		}
		
		return result;
	}
	
	// imports 1 trait definition
	_import(oasDef:any) {
		const methodConverter = new Oas20MethodConverter(this.model, this.dereferencedAPI[this.currentParam], '', this.def);
		
		const result: Method = methodConverter._import({ parameters: oasDef.parameters });
		if (result.hasOwnProperty('is')) delete result.is;
		
		return result;
	}
	
	static getTraitName(fullName) {
		const index = fullName.indexOf(':');
		return index < 0 ? fullName : fullName.substring(index + 1, fullName.lastIndexOf(':'));
	}
	
}

module.exports = Oas20TraitConverter;
