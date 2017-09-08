// @flow
const _ = require('lodash');
const ConverterModel = require('oas-raml-converter-model');
const Annotation = ConverterModel.Annotation;
const Converter = require('../converters/converter');
const oasHelper = require('../helpers/oas20');

class Oas30AnnotationConverter extends Converter {

	_export(model: any) {
		const oasDef = {};

		for (const id in model.annotations) {
			if (!model.annotations.hasOwnProperty(id)) continue;

			const annotation: Annotation = model.annotations[id];
			const name: string = annotation.name;
			const excludedAnnotations = [
				'oas-deprecated',
				'oas-paths',
				'oas-collectionFormat',
				'oas-schema-title',
				'oas-global-response-definition',
				'oas-responses',
				'oas-definition-name'
			];
			if (_.includes(excludedAnnotations, name)) continue;
			this.exportAnnotation(oasDef, annotation);
		}

		return oasDef;
	}

	exportAnnotation(oasDef: any, value: Annotation) {
		const oasValidFacets = [
			'oas-summary',
			'oas-externalDocs',
			'oas-readOnly',
			'oas-responses-default',
			'oas-format',
			'oas-body-name'
		];
		const annotationPrefix = oasHelper.getAnnotationPrefix;
		let name;
		if (_.includes(oasValidFacets, value.name)) {
			if (value.name === 'oas-body-name') {
				name = value.name.replace('oas-body-', '');
			} else if (value.name === 'oas-responses-default') {
				name = annotationPrefix + value.name.replace('oas-', '');
			} else {
				name = value.name.replace('oas-', '');
			}
		} else {
			name = annotationPrefix + value.name;
		}
		oasDef[name] = value.definition;
		if (value.annotations != null && !_.isEmpty(value.annotations)) {
			const annotations: Annotation[] = value.annotations;
			for (let i = 0; i < annotations.length; i++) {
				this.exportAnnotation(oasDef[name], annotations[i]);
			}
		}
	}
}

module.exports = Oas30AnnotationConverter;
