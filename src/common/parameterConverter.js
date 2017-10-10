// @flow
const _ = require('lodash');
const ConverterModel = require('oas-raml-converter-model');
const Root = ConverterModel.Root;
const Parameter = ConverterModel.Parameter;
const Annotation = ConverterModel.Annotation;
const Definition = ConverterModel.Definition;
const Converter = require('../converters/converter');
const RamlDefinitionConverter = require('../raml/ramlDefinitionConverter');
const RamlAnnotationConverter = require('../raml/ramlAnnotationConverter');
const ramlHelper = require('../helpers/raml');

class ParameterConverter extends Converter {
	
	constructor(model:Root, annotationPrefix:string, ramlDef:any, _in:string) {
		super(model, annotationPrefix, ramlDef);
		if (!_.isEmpty(_in)) this._in = _in;
	}
	
	export(models:any[], exportRaml?:boolean) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		for (let i = 0; i < models.length; i++) {
			const model: Parameter = models[i];
			if (model && !model.hasOwnProperty('reference') && (!this._in || model._in === this._in))
				result[model.name] = this._export(model, exportRaml);
		}
		
		return result;
	}
	
	// exports 1 parameter definition
	_export(model:Parameter, exportRaml?:boolean) {
		const definitionConverter = new RamlDefinitionConverter(this.model, this.annotationPrefix, this.def);
		
		const definition: ?Definition = model.definition;
		const ramlDef = definitionConverter._export(definition);
		if (!exportRaml && model._in === 'header' && ((ramlDef.type && !ramlHelper.getBuiltinTypes.includes(ramlDef.type)) || !ramlDef.type)) ramlDef.type = 'string';
		
		if (model.hasOwnProperty('displayName')) ramlDef.displayName = model.displayName;
		if (model.hasOwnProperty('annotations')) {
			const annotationConverter = new RamlAnnotationConverter(this.model, this.annotationPrefix, this.def);
			_.assign(ramlDef, annotationConverter._export(model));
		}
		ParameterConverter.exportRequired(model, ramlDef);
		
		return ramlDef;
	}
	
	static exportRequired(source:Parameter, target:any) {
		if (source.hasOwnProperty('required')) target.required = source.required;
		if (target.hasOwnProperty('required') && target.required)
			delete target.required;
	}
	
	// imports 1 parameter definition
	_import(ramlDef:any) {
		const definitionConverter = new RamlDefinitionConverter();
		
		let model = new Parameter();
		model.name = ramlDef.name;
		if (ramlDef.hasOwnProperty('displayName')) {
			model.displayName = ramlDef.displayName;
			delete ramlDef.displayName;
		}
		const definition: Definition = definitionConverter._import(ramlDef);
		if (!ramlDef.hasOwnProperty('type') && definition) delete definition.internalType;
		ParameterConverter.importRequired(ramlDef, model);
		if (ramlDef.hasOwnProperty('annotations') && !_.isEmpty(ramlDef.annotations)) {
			const annotationConverter = new RamlAnnotationConverter();
			const annotations: Annotation[] = annotationConverter._import(ramlDef);
			if (!_.isEmpty(annotations)) model.annotations = annotations;
			delete definition.annotations;
		}
		model.definition = definition;
		
		return model;
	}
	
	static importRequired(source:any, target:Parameter) {
		target.required = source.hasOwnProperty('required') ? source.required : true;
	}
	
}

module.exports = ParameterConverter;
