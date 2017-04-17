const _ = require('lodash');
const Resource = require('../model/resource');
const Converter = require('../model/converter');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');
const Raml10MethodConverter = require('../raml10/Raml10MethodConverter');
const Raml10ParameterConverter = require('../raml10/Raml10ParameterConverter');
const helper = require('../helpers/converter');

class Raml10ResourceConverter extends Converter {
	
	export(models, currentPath) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		models.map(model => {
			if (!model.hasOwnProperty('parentPath')) {
				result[model.relativePath] = this._export(model);
			}
		});
		
		const innerMap = {};
		models.map(model => {
			if (model.hasOwnProperty('parentPath')) {
				const rootPath = Raml10ResourceConverter.getRootPath(model.path, currentPath, Object.keys(result));
				const value = innerMap[rootPath];
				const models = value ? value : [];
				models.push(model);
				innerMap[rootPath] = models;
			}
		});
		
		if (!_.isEmpty(result)) {
			for (const id in innerMap) {
				if (!innerMap.hasOwnProperty(id)) continue;
				
				if (_.isEmpty(models)) continue;
				if (result.hasOwnProperty(id)) {
					const parent = result[id];
					const innerModels = innerMap[id];
					for (const index in innerModels) {
						if (!innerModels.hasOwnProperty(index)) continue;
						
						const model = innerModels[index];
						if (model.parentPath === id)
							delete model.parentPath;
					}
					const resources = this.export(innerModels, currentPath ? currentPath + id : id);
					for (const path in resources) {
						if(!resources.hasOwnProperty(path)) continue;
						
						parent[path] = resources[path];
					}
				}
			}
		}
		
		return result;
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
				for (const id in model.annotations) {
					if (!model.annotations.hasOwnProperty(id)) continue;
					
					const value = model.annotations[id];
					const keys = Object.keys(value);
					if (!_.isEmpty(keys)) {
						const key = keys[0];
						ramlDef['(' + key + ')'] = value[key];
					}
				}
			}
		}
		
		return ramlDef;
	}
	
	static getRootPath(modelPath, currentPath, rootPaths) {
			const path = currentPath ? modelPath.replace(currentPath, "") : modelPath;
			for (const id in rootPaths) {
				if (!rootPaths.hasOwnProperty(id)) continue;
				const root = rootPaths[id];
				if (path.startsWith(root)) return root;
			}
			return path;
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
				for (const index in models) {
					if (!models.hasOwnProperty(index)) continue;
					
					if (!models[index].hasOwnProperty('parentPath'))
						models[index].parentPath = ramlDef.relativeUri;
				}
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
		
		const annotations = [];
		if (ramlDef.hasOwnProperty('annotations')) {
			if (!_.isEmpty(ramlDef.annotations)) {
				for (const id in ramlDef.annotations) {
					if (!ramlDef.annotations.hasOwnProperty(id)) continue;
					
					const annotation = {};
					annotation[id] = ramlDef.annotations[id].structuredValue;
					annotations.push(annotation);
				}
				model.annotations = annotations;
			}
		}
		
		return model;
	}
}

module.exports = Raml10ResourceConverter;