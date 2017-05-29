const _ = require('lodash');
const Converter = require('../model/converter');
const AnnotationType = require('../model/annotationType');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');
const helper = require('../helpers/converter');
 
class Raml10AnnotationTypeConverter extends Converter {
	
	constructor(model, annotationPrefix, ramlDef) {
		super(model);
		this.annotationPrefix = annotationPrefix;
		this.ramlDef = ramlDef;
	}
	
	export(models) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		for (const id in models) {
			if (!models.hasOwnProperty(id)) continue;
			
			const model = models[id];
			result[id] = this._export(model);
		}
		
		return result;
	}
	
	// exports 1 annotation type definition
	_export(model) {
		const definitionConverter = new Raml10DefinitionConverter(this.model, this.annotationPrefix, this.ramlDef);
		let ramlDef;
		if (typeof model === 'object') {
			ramlDef = definitionConverter._export(model);
			if (ramlDef.hasOwnProperty('allowedTargets')) {
				if (_.isArray(ramlDef.allowedTargets) && ramlDef.allowedTargets.length == 1)
					ramlDef.allowedTargets = ramlDef.allowedTargets[0];
			}
		} else if (typeof model === 'string') {
			ramlDef = { type: model };
		}
		
		return ramlDef;
	}
	
	static copyObjectFrom(object, attrIdMap, attrIdSkip) {
		const result = new AnnotationType();
		
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;
			
			if (attrIdSkip.indexOf(id) < 0) {
				result[attrIdMap.hasOwnProperty(id) ? attrIdMap[id] : id] = object[id];
			}
		}
		
		return result;
	}
	
	import(ramlDefs) {
		let result = {};
		if (_.isEmpty(ramlDefs)) return result;
		
		helper.removePropertiesFromObject(ramlDefs, ['typePropertyKind']);
		for (const id in ramlDefs) {
			if (!ramlDefs.hasOwnProperty(id)) continue;
			
			const ramlDef = ramlDefs[id];
			const keys = Object.keys(ramlDef);
			if (!_.isEmpty(keys) && keys.length == 1){
				const name = keys[0];
				result[name] = this._import(ramlDef[name]);
			}
		}
		return result;
	}
	
	_import(ramlDef) {
		const definitionConverter = new Raml10DefinitionConverter();
		const model = definitionConverter._import(ramlDef);
		if (ramlDef.hasOwnProperty('displayName')) model.displayName = ramlDef.displayName;
		if (_.endsWith(ramlDef.type, '?')) model.required = false;
		if (model.hasOwnProperty('title')) delete model.title;
		
		return model;
	}

}

module.exports = Raml10AnnotationTypeConverter;