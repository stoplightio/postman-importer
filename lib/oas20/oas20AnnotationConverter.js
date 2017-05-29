const _ = require('lodash');
const Converter = require('../model/converter');
const oasHelper = require('../helpers/oas20');

class Oas20AnnotationConverter extends Converter {
	
	_export(model) {
		const oasDef = {};
		
		for (const id in model.annotations) {
			if (!model.annotations.hasOwnProperty(id)) continue;
			
			const annotation = model.annotations[id];
			const name = annotation.name;
			const excludedAnnotations = ['oas-body-name', 'oas-deprecated', 'oas-responses-default', 'oas-paths', 'oas-collectionFormat', 'oas-schema-title', 'oas-global-response-definition', 'oas-responses'];
			if (_.includes(excludedAnnotations, name) || (name === 'oas-summary' && model.hasOwnProperty('summary')) || (name === 'oas-externalDocs') && model.hasOwnProperty('externalDocs')) continue;
			this.exportAnnotation(oasDef, annotation);
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
			if (!oasDef.hasOwnProperty(id) || (!id.startsWith(annotationPrefix) && !id.startsWith('x-')) || id === 'x-basePath') continue;
			annotations.push(this.importAnnotation(id, oasDef[id]));
			delete oasDef[id];
		}
		
		return annotations;
	}
	
	importAnnotation(id, value) {
		const annotationPrefix = id.startsWith(oasHelper.getAnnotationPrefix) ? oasHelper.getAnnotationPrefix : 'x-';
		
		const name = id.substring(annotationPrefix.length, id.length);
		const annotation = { name: name };
		annotation.definition = value;
		
		if (typeof value === 'object') {
			const annotations = [];
			for (const index in value) {
				if (!value.hasOwnProperty(index) || (!index.startsWith(annotationPrefix) && !index.startsWith('x-'))) continue;
				
				const val = value[index];
				annotations.push(this.importAnnotation(index, val));
				delete value[index];
			}
			if (!_.isEmpty(annotations)) annotation.annotations = annotations;
		}
		
		return annotation;
	}
}

module.exports = Oas20AnnotationConverter;