const _ = require('lodash');
const Resource = require('../model/resource');
const Converter = require('../model/converter');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');
const Raml10MethodConverter = require('../raml10/Raml10MethodConverter');
const Raml10ParameterConverter = require('../raml10/Raml10ParameterConverter');
const Raml10AnnotationConverter = require('../raml10/Raml10AnnotationConverter');
const helper = require('../helpers/converter');

class Raml10ResourceConverter extends Converter {

	export(models) {
		let result = {};
		if (_.isEmpty(models)) return result;

		models.map(model => {
			const paths = model.path.split('/');
			paths.shift();
			const relativePath = model.path.substring(model.path.lastIndexOf('/'));
			result = this.mapResource(model, result, paths, relativePath);
		});
		return result;
	}

	mapResource(model, result, paths, relativePath) {
		let path = paths.shift();
		path = '/' + path;
		if (!_.includes(Object.keys(result), path)) {
			if (path !== relativePath) {
				result[path] = this.mapResource(model, {}, paths, relativePath);
				return result;
			} else {
				result[path] = this._export(model);
				return result;
			}
		} else {
			this.mapResource(model, result[path] , paths, relativePath);
			return result;
		}
	}
	
	// exports 1 resource definition
	_export(model) {
		const attrIdMap = {
			'resourceType': 'type'
		};

		const attrIdSkip = ['path', 'relativePath', 'methods', 'resources', 'parameters', 'annotations'];
		const ramlDef = Raml10ResourceConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);
		const methodConverter = new Raml10MethodConverter(this.model, model.path);
		
		if (model.hasOwnProperty('parameters')) {
			if (_.isArray(model.parameters) && !_.isEmpty(model.parameters)) {
				const parameterConverter = new Raml10ParameterConverter(this.model, model.path);
				const uriParameters = parameterConverter.export(model.parameters);
				if (!_.isEmpty(uriParameters)) ramlDef.uriParameters = uriParameters;
			}
		}
		
		if (model.hasOwnProperty('methods')) {
			if (_.isArray(model.methods) && !_.isEmpty(model.methods)) {
				const methods = methodConverter.export(model.methods);
				for (const id in methods) {
					if (!methods.hasOwnProperty(id)) continue;
					ramlDef[id] = methods[id];
				}
			}
		}
		
		if (model.hasOwnProperty('resources')) {
			if (_.isArray(model.resources) && !_.isEmpty(model.resources)) {
				for (const id in model.resources) {
					if (!model.resources.hasOwnProperty(id)) continue;

					const value = model.resources[id];
					ramlDef[value.relativePath] = this._export(value);
				}
			}
		}
		
		if (model.hasOwnProperty('annotations')) {
			if (_.isArray(model.annotations) && !_.isEmpty(model.annotations)) {
				const annotationConverter = new Raml10AnnotationConverter();
				_.assign(ramlDef, annotationConverter._export(model));
			}
		}
		
		return ramlDef;
	}
	
	static copyObjectFrom(object, attrIdMap, attrIdSkip) {
		const result = new Resource();
		
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

		helper.removePropertiesFromObject(ramlDefs,['typePropertyKind', 'structuredExample', 'fixedFacets']);
		for (const id in ramlDefs) {
			if (!ramlDefs.hasOwnProperty(id)) continue;
			
			const ramlDef = ramlDefs[id];
			result.push(this._import(ramlDef));
			if (ramlDef.hasOwnProperty('resources') && _.isArray(ramlDef.resources)) {
				const models = this.import(ramlDef.resources);
				result = result.concat(models);
			}
		}
		
		return result;
	}

	// imports 1 resource definition
	_import(ramlDef) {
		const attrIdMap = {
			'type': 'resourceType',
			'relativeUri': 'relativePath'
		};

		const attrIdSkip = ['methods', 'resources', 'relativeUriPathSegments', 'uriParameters', 'annotations', 'absoluteUri'];
		const model = Raml10ResourceConverter.copyObjectFrom(ramlDef, attrIdMap, attrIdSkip);

		if (ramlDef.hasOwnProperty('absoluteUri')) {
			if (this.model.baseUri){
				model.path = ramlDef.absoluteUri.replace(this.model.baseUri.uri,"");
			} else {
				model.path = ramlDef.absoluteUri;
			}
		}

		if (ramlDef.hasOwnProperty('uriParameters') && !_.isEmpty(ramlDef.uriParameters)) {
			const parameterConverter = new Raml10ParameterConverter();
			const modelParameters = [];
			for (const id in ramlDef.uriParameters) {
				if (!ramlDef.uriParameters.hasOwnProperty(id)) continue;
				
				const parameter = parameterConverter._import(ramlDef.uriParameters[id]);
				parameter._in = 'path';
				modelParameters.push(parameter);
			}
			model.parameters = modelParameters;
		}
		
		if (ramlDef.hasOwnProperty('methods')) {
			if (_.isArray(ramlDef.methods) && !_.isEmpty(ramlDef.methods)) {
				const methodConverter = new Raml10MethodConverter();
				model.methods = methodConverter.import(ramlDef.methods);
				for (const id in model.methods) {
					if (!model.methods.hasOwnProperty(id)) continue;
					
					model.methods[id].path = model.path;
				}
			}
		}
		
		if (ramlDef.hasOwnProperty('annotations')) {
			if (!_.isEmpty(ramlDef.annotations)) {
				const annotationConverter = new Raml10AnnotationConverter();
				const annotations = annotationConverter._import(ramlDef);
				if (!_.isEmpty(annotations)) model.annotations = annotations;
			}
		}
		
		return model;
	}
}

module.exports = Raml10ResourceConverter;