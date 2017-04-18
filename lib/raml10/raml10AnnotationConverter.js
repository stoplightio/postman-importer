const _ = require('lodash');
const Converter = require('../model/converter');

class Raml10AnnotationConverter extends Converter {
	
	_export(model) {
		const ramlDef = {};
		
		for (const id in model.annotations) {
			if (!model.annotations.hasOwnProperty(id)) continue;
			
			const value = model.annotations[id];
			const keys = Object.keys(value);
			if (!_.isEmpty(keys)) {
				const key = keys[0];
				ramlDef['(' + key + ')'] = value[key];
			}
		}
		
		return ramlDef;
	}
	
	_import(ramlDef) {
		const annotations = [];
		
		for (const id in ramlDef.annotations) {
			if (!ramlDef.annotations.hasOwnProperty(id)) continue;
			
			const annotation = {};
			annotation[id] = ramlDef.annotations[id].structuredValue;
			annotations.push(annotation);
		}
		
		return annotations;
	}
}

module.exports = Raml10AnnotationConverter;