const _ = require('lodash');
const Parameter = require('../model/parameter');
const Converter = require('../model/converter');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');

class Raml10ParameterConverter extends Converter {
	
	export(models) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		models.map(model => {
			result[model.name] = this._export(model);
		});
		
		return result;
	}
	
	// exports 1 parameter definition
	_export(model) {
		const definitionConverter = new Raml10DefinitionConverter();
		
		const ramlDef = definitionConverter._export(model.definition);
		Raml10ParameterConverter.exportRequired(model, ramlDef);
		
		return ramlDef;
	}
	
	static exportRequired(source, target) {
		if (source.hasOwnProperty('required')) target.required = source.required;
		if (target.hasOwnProperty('required') && target.required)
			delete target.required;
	}
	
	// imports 1 parameter definition
	_import(ramlDef) {
		const definitionConverter = new Raml10DefinitionConverter();
		
		let model = new Parameter();
		model.name = ramlDef.name;
		model.definition = definitionConverter._import(ramlDef);
		Raml10ParameterConverter.importRequired(ramlDef, model);
		
		return model;
	}
	
	static importRequired(source, target) {
		target.required = source.hasOwnProperty('required') ? source.required : true;
	}
	
}

module.exports = Raml10ParameterConverter;