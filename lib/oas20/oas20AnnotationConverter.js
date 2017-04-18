const _ = require('lodash');
const Converter = require('../model/converter');
const AnnotationType = require('../model/annotationType');
const ramlHelper = require('../helpers/raml10');

class Oas20AnnotationConverter extends Converter {
	
	_export(model) {
		const oasDef = {};
		
		for (const id in model.annotations) {
			if (!model.annotations.hasOwnProperty(id)) continue;
			
			const value = model.annotations[id];
			const keys = Object.keys(value);
			if (!_.isEmpty(keys)) {
				const key = keys[0];
				oasDef['x-annotation-' + key] = value[key];
			}
		}
		
		return oasDef;
	}
	
	_import(oasDef) {
		const annotations = [];
		const annotationPrefix = ramlHelper.getAnnotationPrefix;
		const annotationTypes = this.model && this.model.annotationTypes ? this.model.annotationTypes : [];
		
		for (const id in oasDef) {
			if (!oasDef.hasOwnProperty(id) || !id.startsWith(annotationPrefix)) continue;
			
			const annotation = {};
			const name = id.substring(annotationPrefix.length, id.length);
			annotation[name] = oasDef[id];
			annotations.push(annotation);
			const annotationType = new AnnotationType();
			annotationType.name = name;
			annotationType.allowedTargets = 'any';
			annotationTypes.push(annotationType);
		}
		if (!_.isEmpty(annotationTypes)) this.model.annotationTypes = annotationTypes;
		
		return annotations;
	}
}

module.exports = Oas20AnnotationConverter;