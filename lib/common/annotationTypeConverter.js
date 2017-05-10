const _ = require('lodash');
const Converter = require('../model/converter');
const Raml10AnnotationTypeConverter = require('../raml10/raml10AnnotationTypeConverter');
const Raml10DefinitionConverter = require('../raml10/raml10DefinitionConverter');

class AnnotationTypeConverter extends Converter {

	// imports 1 annotation type definition
	_import(definition) {
		const attrIdSkip = ['type'];
		const model = Raml10AnnotationTypeConverter.copyObjectFrom(definition, {}, attrIdSkip);
		const definitionConverter = new Raml10DefinitionConverter();

		if (model.hasOwnProperty('allowedTargets') && !_.isEmpty(model.allowedTargets) && model.allowedTargets.length == 1)
			model.allowedTargets = model.allowedTargets[0];
		const definitionAttrIdSkip = ['displayName', 'description', 'allowedTargets'];
		const definitionModel = Raml10AnnotationTypeConverter.copyObjectFrom(definition, definitionAttrIdSkip, definitionAttrIdSkip);
		if (_.endsWith(definitionModel.type, '?')) model.required = false;
		model.definition = definitionConverter._import(definitionModel);

		return model;
	}
}

module.exports = AnnotationTypeConverter;