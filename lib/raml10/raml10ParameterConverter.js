const _ = require('lodash');
const Parameter = require('../model/parameter');
const Converter = require('../model/converter');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');
const Raml10AnnotationConverter = require('../raml10/Raml10AnnotationConverter');
const helper = require('../helpers/converter');

class Raml10ParameterConverter extends Converter {
	
	constructor(model, parentResource, traitModels, inheritedParams) {
		super(model);
		this.parentResource = parentResource;
		this.traitModels = traitModels;
		this.inheritedParams = inheritedParams;
	}
	
	export(models) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		const parentResource = this.parentResource;
		const resourceTypeModel = helper.getResourceTypeModel(this.model, parentResource);
		
		models.map(model => {
			let names = [];
			if (this.traitModels) names = this.traitModels.map(traitModel => {
				return traitModel.name + ':' + model.name;
			});
			if (!this.inheritedParams || _.isEmpty(this.inheritedParams)) this.inheritedParams = Raml10ParameterConverter.getInheritedParams(resourceTypeModel);
			const inheritedParam = _.intersection(this.inheritedParams, names);
			if (_.isEmpty(inheritedParam) && !this.inheritedParams.includes(model.name) && !model.hasOwnProperty('reference'))
				result[model.name] = this._export(model);
		});
		
		return result;
	}
	
	// exports 1 parameter definition
	_export(model) {
		const definitionConverter = new Raml10DefinitionConverter();
		
		const ramlDef = definitionConverter._export(model.definition);
		if (model.hasOwnProperty('annotations')) {
			const annotationConverter = new Raml10AnnotationConverter();
			_.assign(ramlDef, annotationConverter._export(model));
		}
		Raml10ParameterConverter.exportRequired(model, ramlDef);
		
		return ramlDef;
	}
	
	static getInheritedParams(resourceTypeModel) {
		let inheritedParams = [];
		if (resourceTypeModel && resourceTypeModel.hasOwnProperty('resource') && resourceTypeModel.resource.hasOwnProperty('parameters')) {
			inheritedParams = resourceTypeModel.resource.parameters.map(function (parameter) { return parameter.name; });
		}
		
		return inheritedParams;
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
		if (ramlDef.hasOwnProperty('annotations') && !_.isEmpty(ramlDef.annotations)) {
			const annotationConverter = new Raml10AnnotationConverter();
			const annotations = annotationConverter._import(ramlDef);
			if (!_.isEmpty(annotations)) model.annotations = annotations;
			delete model.definition.annotations;
		}
		
		return model;
	}
	
	static importRequired(source, target) {
		target.required = source.hasOwnProperty('required') ? source.required : true;
	}
	
}

module.exports = Raml10ParameterConverter;