const _ = require('lodash');
const Converter = require('../model/converter');
const Raml10RootConverter = require('../raml10/Raml10RootConverter');
const Raml10SecurityDefinitionConverter = require('../raml10/Raml10SecurityDefinitionConverter');
const Raml10ResourceConverter = require('../raml10/Raml10ResourceConverter');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');
const Raml10ResourceTypeConverter = require('../raml10/Raml10ResourceTypeConverter');
const Raml10TraitConverter = require('../raml10/Raml10TraitConverter');

class Raml10Converter extends Converter {

	export(model) {
		const raml10RootConverter = new Raml10RootConverter();
		const ramlDef = raml10RootConverter.export(model);
		const raml10SecurityDefinitionConverter = new Raml10SecurityDefinitionConverter();
		if (model.securityDefinitions) ramlDef.securitySchemes = raml10SecurityDefinitionConverter.export(model.securityDefinitions);
		const raml10DefinitionConverter = new Raml10DefinitionConverter();
		if (model.types) ramlDef.types = raml10DefinitionConverter.export(model.types);
		const raml10ResourceTypeConverter = new Raml10ResourceTypeConverter();
		if (model.resourceTypes) ramlDef.resourceTypes = raml10ResourceTypeConverter.export(model.resourceTypes);
		const raml10TraitConverter = new Raml10TraitConverter();
		if (model.traits) ramlDef.traits = raml10TraitConverter.export(model.traits);
		const raml10ResourceConverter = new Raml10ResourceConverter(model);
		if (model.resources) _.merge(ramlDef, raml10ResourceConverter.export(model.resources));

		return ramlDef;
	}

	import(ramlDef) {
		const raml10RootConverter = new Raml10RootConverter();
		const model = raml10RootConverter.import(ramlDef);
		const raml10SecurityDefinitionConverter = new Raml10SecurityDefinitionConverter();
		if (ramlDef.securitySchemes) model.securityDefinitions = raml10SecurityDefinitionConverter.import(ramlDef.securitySchemes);
		const raml10DefinitionConverter = new Raml10DefinitionConverter();
		if (ramlDef.types) model.types = raml10DefinitionConverter.import(ramlDef.types);
		const raml10ResourceTypeConverter = new Raml10ResourceTypeConverter();
		if (ramlDef.resourceTypes) model.resourceTypes = raml10ResourceTypeConverter.import(ramlDef.resourceTypes);
		const raml10TraitConverter = new Raml10TraitConverter();
		if (ramlDef.traits) model.traits = raml10TraitConverter.import(ramlDef.traits);
		const raml10ResourceConverter = new Raml10ResourceConverter(model);
		if (ramlDef.resources) model.resources = raml10ResourceConverter.import(ramlDef.resources);

		return model;
	}
}

module.exports = Raml10Converter;