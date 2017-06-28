const _ = require('lodash');
const Converter = require('../model/converter');
const Raml10CustomAnnotationConverter = require('../raml10/Raml10CustomAnnotationConverter');
const ramlHelper = require('../helpers/raml10');

class Raml10AnnotationConverter extends Converter {
	
	_export(model) {
		const ramlDef = {};
		
		for (const id in model.annotations) {
			if (!model.annotations.hasOwnProperty(id)) continue;
			
			const value = model.annotations[id];
			this.exportAnnotation(ramlDef, value);
		}
		
		return ramlDef;
	}
	
	exportAnnotation(ramlDef, value) {
		const name = '(' + value.name + ')';
		ramlDef[name] = value.definition;
		if (value.hasOwnProperty('annotations') && !_.isEmpty(value.annotations)) {
			for (const index in value.annotations) {
				if (!value.annotations.hasOwnProperty(index)) continue;
				
				this.exportAnnotation(ramlDef[name], value.annotations[index]);
			}
		}
		if (this.def) Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, value.name, value.definition);
	}
	
	_import(ramlDef) {
		const annotations = [];
		const skipAnnotations = ['oas-info', 'oas-tags-definition', 'oas-tags'];

		if (typeof ramlDef.annotations === 'object') {
			for (const id in ramlDef.annotations) {
				if (!ramlDef.annotations.hasOwnProperty(id) || _.includes(skipAnnotations, id)) continue;
				
				const name = _.isArray(ramlDef.annotations) ? ramlDef.annotations[id].name.replace('(','').replace(')','') : id.replace('(','').replace(')','');
				const value = _.isArray(ramlDef.annotations) ? ramlDef.annotations[id].definition : (ramlDef.annotations[id].hasOwnProperty('structuredValue') ? ramlDef.annotations[id].structuredValue : ramlDef.annotations[id]);
				annotations.push(this.importAnnotation(name, value));
			}
		}
		
		if (typeof ramlDef.scalarsAnnotations === 'object') {
			for (const id in ramlDef.scalarsAnnotations) {
				if (!ramlDef.scalarsAnnotations.hasOwnProperty(id)) continue;
				
				const value = ramlDef.scalarsAnnotations[id];
				if (id === 'baseUri') {
					const annotations = this.model.baseUri.annotations ? this.model.baseUri.annotations : [];
					for (const index in value) {
						if (!value.hasOwnProperty(index)) continue;
						
						const val = value[index];
						annotations.push(this.importAnnotation(val.name, value[index].structuredValue));
						this.model.baseUri.annotations = annotations;
					}
				}
			}
		}

		if (!ramlDef.hasOwnProperty('annotations') && !ramlDef.hasOwnProperty('scalarAnnotations')) {
			const annotationPrefix = ramlHelper.getAnnotationPrefix;
			for (const id in ramlDef) {
				if (!ramlDef.hasOwnProperty(id)) continue;

				if (typeof ramlDef[id] === 'object' && !_.isEmpty(ramlDef[id])) {
					const annotations = this._import(ramlDef[id]);
					if (!_.isEmpty(annotations)) ramlDef[id].annotations = annotations;
				}
				if (id.startsWith(annotationPrefix)) {
					annotations.push(this.importAnnotation(id.substring(1, id.length - 1), ramlDef[id]));
					delete ramlDef[id];
				}
			}
		}

		return annotations;
	}
	
	importAnnotation(name, value) {
		const annotationPrefix = ramlHelper.getAnnotationPrefix;
		const annotation = { name: name };
		annotation.definition = value;
		
		if (typeof value === 'object') {
			const annotations = [];
			for (const index in value) {
				if (!value.hasOwnProperty(index)) continue;

				const val = value[index];
				if (index.startsWith(annotationPrefix)) {
					annotations.push(this.importAnnotation(index.substring(1, index.length - 1), val));
					delete value[index];
				}
			}
			if (!_.isEmpty(annotations)) annotation.annotations = annotations;
		}
		
		return annotation;
	}
}

module.exports = Raml10AnnotationConverter;