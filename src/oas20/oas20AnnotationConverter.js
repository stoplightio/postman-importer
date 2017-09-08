// @flow
const _ = require('lodash');
const ConverterModel = require('oas-raml-converter-model');
const Definition = ConverterModel.Definition;
const Annotation = ConverterModel.Annotation;
const Converter = require('../converters/converter');
const oasHelper = require('../helpers/oas20');

class Oas20AnnotationConverter extends Converter {
	
	_export(model:any) {
		const oasDef = {};
		
		for (const id in model.annotations) {
			if (!model.annotations.hasOwnProperty(id)) continue;
			
			const annotation: Annotation = model.annotations[id];
			const name: string = annotation.name;
			const excludedAnnotations = ['oas-deprecated', 'oas-paths', 'oas-collectionFormat', 'oas-schema-title', 'oas-global-response-definition', 'oas-responses', 'oas-definition-name'];
			if (_.includes(excludedAnnotations, name)) continue;
			this.exportAnnotation(oasDef, annotation);
		}
		
		return oasDef;
	}
	
	exportAnnotation(oasDef:any, value:Annotation) {
		const oasValidFacets = ['oas-summary', 'oas-externalDocs', 'oas-readOnly', 'oas-responses-default', 'oas-format', 'oas-body-name'];
		const annotationPrefix = oasHelper.getAnnotationPrefix;
		let name;
		if (_.includes(oasValidFacets, value.name)) {
			if (value.name === 'oas-body-name')
				name = value.name.replace('oas-body-', '');
			else if (value.name === 'oas-responses-default')
				name = annotationPrefix + value.name.replace('oas-', '');
			else
				name = value.name.replace('oas-', '');
		} else {
			name = annotationPrefix + value.name;
		}
		oasDef[name] = value.definition;
		if (value.hasOwnProperty('annotations') && !_.isEmpty(value.annotations) && value.annotations != null) {
			const annotations: Annotation[] = value.annotations;
			for (let i = 0; i < annotations.length; i++) {
				this.exportAnnotation(oasDef[name], annotations[i]);
			}
		}
	}
	
	_import(oasDef:any) {
		const annotations: Annotation[] = [];
		const annotationPrefix = oasHelper.getAnnotationPrefix;

		for (const id in oasDef) {
			if (!oasDef.hasOwnProperty(id) || (!id.startsWith(annotationPrefix) && !id.startsWith('x-')) || id === 'x-basePath') continue;
			annotations.push(this.importAnnotation(id, oasDef[id]));
			delete oasDef[id];
		}
		
		return annotations;
	}
	
	importAnnotation(id:string, value:any) {
		const annotationPrefix = id.startsWith(oasHelper.getAnnotationPrefix) ? oasHelper.getAnnotationPrefix : 'x-';
		
		const annotation = new Annotation();
		annotation.name = id.substring(annotationPrefix.length, id.length);
		
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
		
		if (typeof value === 'object' && !_.isArray(value) && value != null) {
			const definition = new Definition();
			_.assign(definition, value);
			annotation.definition = definition;
		} else {
			annotation.definition = value;
		}
		
		return annotation;
	}
}

module.exports = Oas20AnnotationConverter;
