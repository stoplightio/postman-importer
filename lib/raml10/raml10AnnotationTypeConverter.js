const _ = require('lodash');
const Converter = require('../model/converter');
const AnnotationType = require('../model/annotationType');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');
const helper = require('../helpers/converter');
 
class Raml10AnnotationTypeConverter extends Converter {
	
	export(models) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		models.map(model => {
			result[model.name] = this._export(model);
		});
		
		return result;
	}
	
	// exports 1 annotation type definition
	_export(model) {
		const attrIdSkip = ['name', 'definition'];
		let ramlDef = Raml10AnnotationTypeConverter.copyObjectFrom(model, {}, attrIdSkip);
		const definitionConverter = new Raml10DefinitionConverter();
		
		if (model.hasOwnProperty('definition')) {
			const definition = definitionConverter._export(model.definition);
			_.assign(ramlDef, definition);
		}
		const keys = Object.keys(ramlDef);
		if (keys.length == 1 && keys.includes('allowedTargets')) {
			ramlDef = ramlDef.allowedTargets;
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
		let result = [];
		if (_.isEmpty(ramlDefs)) return result;
		
		helper.removePropertiesFromObject(ramlDefs, ['typePropertyKind']);
		for (const id in ramlDefs) {
			if (!ramlDefs.hasOwnProperty(id)) continue;
			
			const ramlDef = ramlDefs[id];
			const keys = Object.keys(ramlDef);
			if (!_.isEmpty(keys) && keys.length == 1)
				result.push(this._import(ramlDef[keys[0]]));
		}
		return result;
	}
	
	// imports 1 annotation type definition
	_import(ramlDef) {
		const attrIdSkip = ['type'];
		const model = Raml10AnnotationTypeConverter.copyObjectFrom(ramlDef, {}, attrIdSkip);
		const definitionConverter = new Raml10DefinitionConverter();
		
		if (model.hasOwnProperty('allowedTargets') && !_.isEmpty(model.allowedTargets) && model.allowedTargets.length == 1)
			model.allowedTargets = model.allowedTargets[0];
		const definitionAttrIdSkip = ['displayName', 'description', 'allowedTargets'];
		const definitionModel = Raml10AnnotationTypeConverter.copyObjectFrom(ramlDef, definitionAttrIdSkip, definitionAttrIdSkip);
		if (_.endsWith(definitionModel.type, '?')) model.required = false;
		model.definition = definitionConverter._import(definitionModel);
		
		return model;
	}
}

module.exports = Raml10AnnotationTypeConverter;