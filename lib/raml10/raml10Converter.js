const _ = require('lodash');
const Converter = require('../model/converter');
const Raml10RootConverter = require('../raml10/Raml10RootConverter');
const Raml10SecurityDefinitionConverter = require('../raml10/Raml10SecurityDefinitionConverter');
const Raml10ResourceConverter = require('../raml10/Raml10ResourceConverter');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');
const Raml10ResourceTypeConverter = require('../raml10/Raml10ResourceTypeConverter');
const Raml10TraitConverter = require('../raml10/Raml10TraitConverter');
const Raml10AnnotationTypeConverter = require('../raml10/Raml10AnnotationTypeConverter');

class Raml10Converter extends Converter {

	export(model) {
		const rootConverter = new Raml10RootConverter();
		const ramlDef = rootConverter.export(model);
		const securityDefinitionConverter = new Raml10SecurityDefinitionConverter();
		if (model.securityDefinitions) ramlDef.securitySchemes = securityDefinitionConverter.export(model.securityDefinitions);
		const definitionConverter = new Raml10DefinitionConverter();
		if (model.types) ramlDef.types = definitionConverter.export(model.types);
		const resourceTypeConverter = new Raml10ResourceTypeConverter();
		if (model.resourceTypes) ramlDef.resourceTypes = resourceTypeConverter.export(model.resourceTypes);
		const traitConverter = new Raml10TraitConverter();
		if (model.traits) ramlDef.traits = traitConverter.export(model.traits);
		const resourceConverter = new Raml10ResourceConverter(model);
		if (model.resources) _.merge(ramlDef, resourceConverter.export(model.resources));
		const annotationTypeConverter = new Raml10AnnotationTypeConverter(model);
		if (model.annotationTypes) ramlDef.annotationTypes = annotationTypeConverter.export(model.annotationTypes);

		return ramlDef;
	}

	import(ramlDef) {
		const rootConverter = new Raml10RootConverter();
		const model = rootConverter.import(ramlDef);
		const securityDefinitionConverter = new Raml10SecurityDefinitionConverter();
		if (ramlDef.securitySchemes) model.securityDefinitions = securityDefinitionConverter.import(ramlDef.securitySchemes);
		const definitionConverter = new Raml10DefinitionConverter();
		if (ramlDef.types) model.types = definitionConverter.import(ramlDef.types);
		const resourceTypeConverter = new Raml10ResourceTypeConverter();
		if (ramlDef.resourceTypes) model.resourceTypes = resourceTypeConverter.import(ramlDef.resourceTypes);
		const traitConverter = new Raml10TraitConverter();
		if (ramlDef.traits) model.traits = traitConverter.import(ramlDef.traits);
		const resourceConverter = new Raml10ResourceConverter(model);
		if (ramlDef.resources) model.resources = resourceConverter.import(ramlDef.resources);
		const annotationTypeConverter = new Raml10AnnotationTypeConverter(model);
		if (ramlDef.annotationTypes) model.annotationTypes = annotationTypeConverter.import(ramlDef.annotationTypes);

		return model;
	}
}

module.exports = Raml10Converter;