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
			if (!model.hasOwnProperty('parentPath'))
				result[model.relativePath] = this._export(model);
		});
		
		const innerMap = {};
		models.map(model => {
			if (model.hasOwnProperty('parentPath')) {
				const rootPath = Raml10ResourceConverter.getRootPath(model, currentPath);
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

		const attrIdSkip = ['path', 'relativePath', 'methods', 'resources', 'parameters'];
		const ramlDef = Raml10ResourceConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);
		const raml10MethodConverter = new Raml10MethodConverter();
		
		if (model.hasOwnProperty('parameters')) {
			if (_.isArray(model.parameters) && !_.isEmpty(model.parameters)) {
				const parameterConverter = new Raml10ParameterConverter();
				ramlDef.uriParameters = parameterConverter.export(model.parameters);
			}
		}
		
		if (model.hasOwnProperty('methods')) {
			if (_.isArray(model.methods) && !_.isEmpty(model.methods)) {
				const methods = raml10MethodConverter.export(model.methods);
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
		
		return ramlDef;
	}
	
	static getRootPath(resourceModel, currentPath) {
		const path = currentPath ? resourceModel.path.replace(currentPath, '') : resourceModel.path;
		const index = path.indexOf(resourceModel.parentPath);
		return index == 0 ? resourceModel.parentPath : path.substring(0, index);
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
		
		helper.removePropertyFromObject(ramlDefs, 'typePropertyKind');
		helper.removePropertyFromObject(ramlDefs, 'structuredExample');
		helper.removePropertyFromObject(ramlDefs, 'fixedFacets');
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
			'absoluteUri': 'path',
			'relativeUri': 'relativePath'
		};

		const attrIdSkip = ['methods', 'resources', 'relativeUriPathSegments', 'uriParameters', 'annotations'];
		const model = Raml10ResourceConverter.copyObjectFrom(ramlDef, attrIdMap, attrIdSkip);
		
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
				const raml10MethodConverter = new Raml10MethodConverter();
				model.methods = raml10MethodConverter.import(ramlDef.methods);
				for (const id in model.methods) {
					if (!model.methods.hasOwnProperty(id)) continue;
					
					model.methods[id].path = ramlDef.absoluteUri;
				}
			}
		}
		
		return model;
	}
}

module.exports = Raml10ResourceConverter;