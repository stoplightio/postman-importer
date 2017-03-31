const _ = require('lodash');
const Resource = require('../model/resource');
const Parameter = require('../model/parameter');
const Converter = require('../model/converter');
const Oas20DefinitionConverter = require('../oas20/Oas20DefinitionConverter');
const Oas20MethodConverter = require('../oas20/Oas20MethodConverter');
const raml10Helper = require('../helpers/raml10');

class Oas20ResourceConverter extends Converter {
	
	export(models) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		models.map(model => {
			const parentAbsolutePath = Oas20ResourceConverter.getParentAbsolutePath(model.path);
			const parents = models.filter(function(model) {
				return model.path == parentAbsolutePath;
			});
			if (!_.isEmpty(parents)) {
				const parent = parents[0];
				const parameters = model.parameters ? model.parameters : [];
				const modelParameters = parameters.map(function(parameter) {
					return parameter.name;
				});
				for (const id in parent.parameters) {
					if (!parent.parameters.hasOwnProperty(id)) continue;
					
					const parameter = parent.parameters[id];
					if (!modelParameters.includes(parameter.name)) {
						parameters.push(parameter);
						model.parameters = parameters;
					}
				}
			}
			result[model.path] = this._export(model);
		});
		
		return result;
	}
	
	// exports 1 resource definition
	_export(model) {
		const attrIdMap = {};
		
		const attrIdSkip = ['path', 'relativePath', 'resourceType', 'description', 'displayName', 'methods', 'resources', 'parameters', 'parentPath'];
		const oasDef = Oas20ResourceConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);
		const oas20DefinitionConverter = new Oas20DefinitionConverter();
		
		if (model.hasOwnProperty('methods')) {
			if (_.isArray(model.methods) && !_.isEmpty(model.methods)) {
				const oas20MethodConverter = new Oas20MethodConverter();
				const methods = oas20MethodConverter.export(model.methods);
				for (const id in methods) {
					if (!methods.hasOwnProperty(id)) continue;
					oasDef[id] = methods[id];
				}
			}
		}
		
		if (model.hasOwnProperty('parameters')) {
			if (_.isArray(model.parameters) && !_.isEmpty(model.parameters)) {
				const parameters = [];
				for (const id in model.parameters) {
					if (!model.parameters.hasOwnProperty(id) || !model.path.includes(model.parameters[id].name)) continue;
					
					const value = model.parameters[id];
					const parameter = Object.assign({}, oas20DefinitionConverter._export(value.definition));
					parameter.in = value._in;
					parameter.name = value.name;
					parameter.required = true;
					if (!parameter.hasOwnProperty('type')) parameter.type = 'string';
					if (parameter.hasOwnProperty('example')) delete parameter.example;
					parameters.push(parameter);
				}
				oasDef.parameters = parameters;
			}
		}
		
		return oasDef;
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
	
	import(oasDefs) {
		const result = [];
		if (_.isEmpty(oasDefs)) return result;
		
		for (const id in oasDefs) {
			if (!oasDefs.hasOwnProperty(id)) continue;
			
			const ramlDef = this._import(oasDefs[id]);
			ramlDef.path = id;
			ramlDef.relativePath = Oas20ResourceConverter.getRelativePath(id);
			const parentPath = Oas20ResourceConverter.getParentPath(id);
			if (!_.isEmpty(parentPath)) ramlDef.parentPath = parentPath;
			result.push(ramlDef);
		}
		
		return result;
	}
	
	_import(oasDef) {
		const attrIdMap = {};
		
		const attrIdSkip = [];
		const model = Oas20ResourceConverter.copyObjectFrom(oasDef, attrIdMap, attrIdSkip.concat(raml10Helper.getValidMethods));
		const oas20DefinitionConverter = new Oas20DefinitionConverter();
		
		const oas20MethodConverter = new Oas20MethodConverter();
		model.methods = oas20MethodConverter.import(oasDef);
		
		if (oasDef.hasOwnProperty('parameters')) {
			if (_.isArray(oasDef.parameters) && !_.isEmpty(oasDef.parameters)) {
				const parameters = [];
				for (const id in oasDef.parameters) {
					if (!oasDef.parameters.hasOwnProperty(id)) continue;
					
					const value = oasDef.parameters[id];
					const parameter = new Parameter();
					parameter._in = value.in;
					parameter.name = value.name;
					parameter.definition = oas20DefinitionConverter._import(value);
					parameters.push(parameter);
				}
				model.parameters = parameters;
			}
		}
		
		return model;
	}
	
	static getParentPath(path) {
		const absoluteParent = path.substring(0, path.lastIndexOf('/'));
		return Oas20ResourceConverter.getRelativePath(absoluteParent);
	}
	
	static getParentAbsolutePath(path) {
		const parentPath = Oas20ResourceConverter.getParentPath(path);
		return path.substring(0, path.indexOf(parentPath)) + parentPath;
	}
	
	static getRelativePath(path) {
		return path.substring(path.lastIndexOf('/'));
	}
	
}

module.exports = Oas20ResourceConverter;