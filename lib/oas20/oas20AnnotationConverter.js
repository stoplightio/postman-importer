const _ = require('lodash');
const Converter = require('../model/converter');
const AnnotationType = require('../model/annotationType');
const oasHelper = require('../helpers/oas20');

class Oas20AnnotationConverter extends Converter {
	
	_export(model) {
		const oasDef = {};
		
		for (const id in model.annotations) {
			if (!model.annotations.hasOwnProperty(id)) continue;
			
			this.exportAnnotation(oasDef, model.annotations[id]);
		}
		
		return oasDef;
	}
	
	exportAnnotation(oasDef, value) {
		const annotationPrefix = oasHelper.getAnnotationPrefix;
		const name = annotationPrefix + value.name;
		oasDef[name] = value.definition;
		if (value.hasOwnProperty('annotations') && !_.isEmpty(value.annotations)) {
			for (const index in value.annotations) {
				if (!value.annotations.hasOwnProperty(index)) continue;
				
				this.exportAnnotation(oasDef[name], value.annotations[index]);
			}
		}
	}
	
	_import(oasDef) {
		const annotations = [];
		const annotationPrefix = oasHelper.getAnnotationPrefix;

		for (const id in oasDef) {
			if (!oasDef.hasOwnProperty(id) || !id.startsWith(annotationPrefix)) continue;
			
			annotations.push(this.importAnnotation(id, oasDef[id]));
			delete oasDef[id];
		}
		
		return annotations;
	}
	
	importAnnotation(id, value) {
		const annotationPrefix = oasHelper.getAnnotationPrefix;
		const annotationTypes = this.model && this.model.annotationTypes ? this.model.annotationTypes : [];
		
		const name = id.substring(annotationPrefix.length, id.length);
		const annotation = { name: name };
		annotation.definition = value;
		const annotationType = new AnnotationType();
		annotationType.name = name;
		annotationType.allowedTargets = value != null ? 'any' : 'nil';
		annotationTypes.push(annotationType)
		
		if (typeof value === 'object') {
			const annotations = [];
			for (const index in value) {
				if (!value.hasOwnProperty(index)) continue;
				
				const val = value[index];
				if (index.startsWith(annotationPrefix)) {
					annotations.push(this.importAnnotation(index, val));
					
					delete value[index];
				}
			}
			if (!_.isEmpty(annotations)) annotation.annotations = annotations;
		}
		if (!_.isEmpty(annotationTypes)) this.model.annotationTypes = annotationTypes;
		
		return annotation;
	}
}

module.exports = Oas20AnnotationConverter;