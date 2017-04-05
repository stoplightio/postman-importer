const _ = require('lodash');
const Converter = require('../model/converter');
const Oas20RootConverter = require('../oas20/Oas20RootConverter');
const Oas20SecurityDefinitionConverter = require('../oas20/Oas20SecurityDefinitionConverter');
const Oas20ResourceConverter = require('../oas20/Oas20ResourceConverter');
const Oas20DefinitionConverter = require('../oas20/OAS20DefinitionConverter');

class Oas20Converter extends Converter {

	export(model) {
		const oas20RootConverter = new Oas20RootConverter();
		const oas20SecurityDefinitionConverter = new Oas20SecurityDefinitionConverter();
		const oas20ResourceConverter = new Oas20ResourceConverter();
		const oas20DefinitionConverter = new Oas20DefinitionConverter();

		const oasDef = oas20RootConverter.export(model);
		if (model.hasOwnProperty('securityDefinitions')) oasDef.securityDefinitions = oas20SecurityDefinitionConverter.export(model.securityDefinitions);
		if (model.hasOwnProperty('resources')) {
			oasDef.paths = oas20ResourceConverter.export(model.resources);
		} else {
			oasDef.paths = {};
		}
		if (model.hasOwnProperty('types')) oasDef.definitions = oas20DefinitionConverter.export(model.types);

		oasDef.swagger = "2.0";

		return oasDef;
	}

	import(oasDef) {
		const oas20RootConverter = new Oas20RootConverter();
		const oas20SecurityDefinitionConverter = new Oas20SecurityDefinitionConverter();
		const oas20ResourceConverter = new Oas20ResourceConverter();
		const oas20DefinitionConverter = new Oas20DefinitionConverter();

		const model = oas20RootConverter.import(oasDef);
		if (oasDef.hasOwnProperty('securityDefinitions')) model.securityDefinitions = oas20SecurityDefinitionConverter.import(oasDef.securityDefinitions);
		if (oasDef.hasOwnProperty('paths')) model.resources = oas20ResourceConverter.import(oasDef.paths);
		if (oasDef.hasOwnProperty('definitions')) model.types = oas20DefinitionConverter.import(oasDef.definitions);

		return model;
	}
}

module.exports = Oas20Converter;