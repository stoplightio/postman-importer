// @flow
const _ = require('lodash');
const Converter = require('../converters/converter');
const ConverterModel = require('oas-raml-converter-model');
const Definition = ConverterModel.Definition;
const AnnotationType = ConverterModel.AnnotationType;
const RamlDefinitionConverter = require('../raml/ramlDefinitionConverter');
const helper = require('../helpers/converter');
 
class RamlAnnotationTypeConverter extends Converter {
	
	export(models:AnnotationType[]) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		for (let i = 0; i < models.length; i++) {
			const model: AnnotationType = models[i];
			result[model.name] = this._export(model);
		}
		
		return result;
	}
	
	// exports 1 annotation type definition
	_export(model:AnnotationType) {
		const definitionConverter = new RamlDefinitionConverter(this.model, this.annotationPrefix, this.def);
		let ramlDef;
		if (model.hasOwnProperty('definition') && typeof model.definition === 'object') {
			const definition: Definition = model.definition;
			ramlDef = definitionConverter._export(definition);
			if (model.hasOwnProperty('required') && !model.required) ramlDef.required = model.required;
			if (model.hasOwnProperty('displayName')) ramlDef.displayName = model.displayName;
			if (ramlDef.hasOwnProperty('allowedTargets') && _.isArray(ramlDef.allowedTargets) && ramlDef.allowedTargets.length === 1) {
				ramlDef.allowedTargets = ramlDef.allowedTargets[0];
			}
		} else if (typeof model.definition === 'string') {
			ramlDef = { type: model };
		}
		
		return ramlDef;
	}
	
	import(ramlDefs:any) {
		let result: AnnotationType[] = [];
		if (_.isEmpty(ramlDefs)) return result;
		
		helper.removePropertiesFromObject(ramlDefs, ['typePropertyKind']);
		for (const id in ramlDefs) {
			if (!ramlDefs.hasOwnProperty(id)) continue;
			
			const ramlDef = ramlDefs[id];
			const keys = Object.keys(ramlDef);
			if (!_.isEmpty(keys) && keys.length === 1){
				const name = keys[0];
				const anntoationType: AnnotationType = this._import(ramlDef[name]);
				result.push(anntoationType);
			}
		}
		
		return result;
	}
	
	_import(ramlDef:any) {
		const definitionConverter = new RamlDefinitionConverter();
		const model = new AnnotationType();
		const definition: Definition = definitionConverter._import(ramlDef);
		model.definition = definition;
		if (definition.hasOwnProperty('name')) model.name = definition.name;
		if (ramlDef.hasOwnProperty('displayName')) model.displayName = ramlDef.displayName;
		if (_.endsWith(ramlDef.type, '?')) model.required = false;
		if (model.definition.hasOwnProperty('title')) delete model.definition.title;
		
		return model;
	}

}

module.exports = RamlAnnotationTypeConverter;
