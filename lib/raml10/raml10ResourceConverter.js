const _ = require('lodash');
const Resource = require('../model/resource');
const Parameter = require('../model/parameter');
const Converter = require('../model/converter');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');
const Raml10MethodConverter = require('../raml10/Raml10MethodConverter');
const raml10Helper = require('../helpers/raml10');

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
		const raml10DefinitionConverter = new Raml10DefinitionConverter();
		
		if (model.hasOwnProperty('parameters')) {
			if (_.isArray(model.parameters) && !_.isEmpty(model.parameters)) {
				const parameters = {};
				for (const id in model.parameters) {
					if (!model.parameters.hasOwnProperty(id)) continue;
					
					const value = model.parameters[id];
					parameters[value.name] = raml10DefinitionConverter._export(value.definition);
					if (parameters[value.name].hasOwnProperty('required') && parameters[value.name].required)
						delete parameters[value.name].required;
				}
				ramlDef.uriParameters = parameters;
			}
		}
		
		if (model.hasOwnProperty('methods')) {
			if (_.isArray(model.methods) && !_.isEmpty(model.methods)) {
				const raml10MethodConverter = new Raml10MethodConverter();
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
		
		raml10Helper.removePropertyFromObject(ramlDefs, 'typePropertyKind');
		raml10Helper.removePropertyFromObject(ramlDefs, 'structuredExample');
		raml10Helper.removePropertyFromObject(ramlDefs, 'fixedFacets');
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
		const raml10DefinitionConverter = new Raml10DefinitionConverter();
		
		if (ramlDef.hasOwnProperty('uriParameters')) {
			if (!_.isEmpty(ramlDef.uriParameters)) {
				const modelParameters = [];
				for (const id in ramlDef.uriParameters) {
					if (!ramlDef.uriParameters.hasOwnProperty(id)) continue;
					
					const value = ramlDef.uriParameters[id];
					const parameter = new Parameter();
					parameter._in = 'path';
					parameter.name = id;
					parameter.definition = raml10DefinitionConverter._import(value);
					if (!parameter.definition.hasOwnProperty('required')) parameter.definition.required = true;
					modelParameters.push(parameter);
				}
				model.parameters = modelParameters;
			}
		}
		
		if (ramlDef.hasOwnProperty('methods')) {
			if (_.isArray(ramlDef.methods) && !_.isEmpty(ramlDef.methods)) {
				const raml10MethodConverter = new Raml10MethodConverter();
				model.methods = raml10MethodConverter.import(ramlDef.methods);
			}
		}
		
		return model;
	}
}

module.exports = Raml10ResourceConverter;