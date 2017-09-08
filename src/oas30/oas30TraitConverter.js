// @flow
const _ = require('lodash');

const ConverterModel = require('oas-raml-converter-model');
const Converter = require('../converters/converter');
const Trait = ConverterModel.Trait;
const Method = ConverterModel.Method;

const Oas30MethodConverter = require('./oas30MethodConverter');

const { Operation } = require('./oas30Types');

class Oas30TraitConverter extends Converter {

	constructor(model:any, dereferencedAPI:any) {
		super(model);
		this.dereferencedAPI = dereferencedAPI;
	}

	export(models:Trait[]) {
		if (_.isEmpty(models)) return {};

		const traits = {};
		for (let i = 0; i < models.length; i++) {
			const model: Trait = models[i];
			if (model.method != null) traits[model.name] = this._export(model.method);
		}

		const paramsResult = {};
		const responsesResult = {};
		for (const id in traits) {
			if (!traits.hasOwnProperty(id)) continue;

			const trait = traits[id];
			for (const index in trait.parameters) {
				if (!trait.parameters.hasOwnProperty(index)) continue;

				const param = trait.parameters[index];
				const name = 'trait_' + id + '_' + index;
				paramsResult[name] = param;
			}
			for (const index in trait.responses) {
				if (!trait.responses.hasOwnProperty(index)) continue;

				const param = trait.responses[index];
				const name = 'trait_' + id + '_' + index;
				responsesResult[name] = param;
			}
		}

		return {
			parameters: paramsResult,
			responses: responsesResult
		};
	}

	_export(model:Method) {
		const methodConverter = new Oas30MethodConverter(this.model, this.dereferencedAPI, '', this.def);

		const methodResult: Operation = methodConverter._export(model);
		const paramsResult = {};
		if (methodResult.parameters != null) {
			for (let i = 0; i < methodResult.parameters.length; i++) {
				const paramResult = methodResult.parameters[i];
				if (paramResult.example != null) delete paramResult.example;
				// $ExpectError sorry, but I don't really know how to fix it and it works as intended
				if (paramResult.hasParams == null) paramsResult[paramResult.name] = paramResult;
			}
		}
		const responsesResult = {};
		if (methodResult.responses != null) {
			for (const id in methodResult.responses) {
				if (!methodResult.responses.hasOwnProperty(id)) continue;

				const responseResult = methodResult.responses[id];
				// $ExpectError sorry, but I don't really know how to fix it and it works as intended
				if (id !== 'default' && !responseResult.hasParams && (id !== 'default' || (responseResult.schema != null || responseResult.headers != null && !_.isEmpty(responseResult.description))))
					responsesResult[id] = methodResult.responses[id];
			}
		}

		return {
			parameters: paramsResult,
			responses: responsesResult
		};
	}
}

module.exports = Oas30TraitConverter;
