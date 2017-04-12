const _ = require('lodash');
const Converter = require('../model/converter');
const Oas20RootConverter = require('../oas20/Oas20RootConverter');
const Oas20SecurityDefinitionConverter = require('../oas20/Oas20SecurityDefinitionConverter');
const Oas20ResourceConverter = require('../oas20/Oas20ResourceConverter');
const Oas20DefinitionConverter = require('../oas20/Oas20DefinitionConverter');
const Oas20TraitConverter = require('../oas20/Oas20TraitConverter');

class Oas20Converter extends Converter {

	export(model) {
		const rootConverter = new Oas20RootConverter();
		const oasDef = rootConverter.export(model);
		oasDef.swagger = "2.0";
		const securityDefinitionConverter = new Oas20SecurityDefinitionConverter();
		if (model.hasOwnProperty('securityDefinitions')) oasDef.securityDefinitions = securityDefinitionConverter.export(model.securityDefinitions);
		const definitionConverter = new Oas20DefinitionConverter();
		if (model.hasOwnProperty('types')) oasDef.definitions = definitionConverter.export(model.types);
		const traitConverter = new Oas20TraitConverter();
		if (model.hasOwnProperty('traits')) {
			const traitsDef = traitConverter.export(model.traits);
			if (!_.isEmpty(traitsDef.parameters)) oasDef.parameters = traitsDef.parameters;
			if (!_.isEmpty(traitsDef.responses)) oasDef.responses = traitsDef.responses;
		}
		const resourceConverter = new Oas20ResourceConverter(model);
		if (model.hasOwnProperty('resources')) {
			oasDef.paths = resourceConverter.export(model.resources);
		} else {
			oasDef.paths = {};
		}

		return oasDef;
	}

	import(oasDef) {
		const rootConverter = new Oas20RootConverter();
		const model = rootConverter.import(oasDef);
		const securityDefinitionConverter = new Oas20SecurityDefinitionConverter();
		if (oasDef.hasOwnProperty('securityDefinitions')) model.securityDefinitions = securityDefinitionConverter.import(oasDef.securityDefinitions);
		const definitionConverter = new Oas20DefinitionConverter();
		if (oasDef.hasOwnProperty('definitions')) model.types = definitionConverter.import(oasDef.definitions);
		const resourceConverter = new Oas20ResourceConverter();
		if (oasDef.hasOwnProperty('paths')) model.resources = resourceConverter.import(oasDef.paths);
		const traitConverter = new Oas20TraitConverter();
		if (oasDef.hasOwnProperty('parameters') || oasDef.hasOwnProperty('responses')) {
			model.traits = traitConverter.import({
				parameters: oasDef.parameters,
				responses: oasDef.responses
			});
		}

		return model;
	}
}

module.exports = Oas20Converter;