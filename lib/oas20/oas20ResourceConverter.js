const _ = require('lodash');
const Resource = require('../model/resource');
const Parameter = require('../model/parameter');
const Converter = require('../model/converter');
const Oas20RootConverter = require('../oas20/Oas20RootConverter');
const Oas20DefinitionConverter = require('../oas20/Oas20DefinitionConverter');
const Oas20MethodConverter = require('../oas20/Oas20MethodConverter');
const helper = require('../helpers/converter');
const stringsHelper = require('../utils/strings');
const oasHelper = require('../helpers/oas20');

class Oas20ResourceConverter extends Converter {

	constructor(model, dereferencedAPI) {
		super(model);
		this.dereferencedAPI = dereferencedAPI;
	}
	
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
			const oasDef = this._export(model);
			const hasNestedResources = models.filter(resource => { return resource.path.startsWith(model.path) && resource.path != model.path }).length > 0;
			const hasOnlyUriParams = oasDef.hasOwnProperty('parameters') && oasDef.parameters.filter(param => { return param.in != 'path' }).length === 0;
			const ignore = hasNestedResources && _.keys(oasDef).length == 1 && hasOnlyUriParams;
			if (!(_.isEmpty(oasDef) || ignore) || model.hasOwnProperty('securedBy')) {
				result[model.path] = oasDef;
			}
		});
		
		return result;
	}
	
	// exports 1 resource definition
	_export(model) {
		const attrIdMap = {};
		
		const attrIdSkip = ['path', 'relativePath', 'resourceType', 'description', 'displayName', 'methods', 'resources', 'parameters', 'is', 'securedBy', 'annotations'];
		const oasDef = Oas20ResourceConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);
		const definitionConverter = new Oas20DefinitionConverter();
		
		if (model.hasOwnProperty('methods')) {
			if (_.isArray(model.methods) && !_.isEmpty(model.methods)) {
				const methodConverter = new Oas20MethodConverter(this.model, model.path);
				const methods = methodConverter.export(model.methods);
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
					const parameter = Object.assign({}, definitionConverter._export(value.definition));
					parameter.in = value._in;
					parameter.name = value.name;
					if (!parameter.hasOwnProperty('description') && value.hasOwnProperty('displayName')) parameter.description = value.displayName;
					parameter.required = true;
					if (!parameter.hasOwnProperty('type')) parameter.type = 'string';
					if (parameter.$ref) delete parameter.$ref;
					helper.removePropertiesFromObject(parameter, ['example']);
					Oas20RootConverter.exportAnnotations(value, parameter);
					parameters.push(parameter);
				}
				oasDef.parameters = parameters;
			}
		}
		
		Oas20RootConverter.exportAnnotations(model, oasDef);
		
		return oasDef;
	}

	static copyObjectFrom(object, attrIdMap, attrIdSkip, annotationPrefix) {
		const result = new Resource();
		
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;
			
			if (attrIdSkip.indexOf(id) < 0 && !id.startsWith(annotationPrefix) && !id.startsWith('x-')) {
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

			if (!id.startsWith('x-')) {
				this.currentPath = id;
				const oasDef = this._import(oasDefs[id]);
				oasDef.path = id;
				oasDef.relativePath = Oas20ResourceConverter.getRelativePath(id);
				if (oasDef.hasOwnProperty('methods')) {
					for (const index in oasDef.methods) {
						if (!oasDef.methods.hasOwnProperty(index)) continue;

						oasDef.methods[index].path = oasDef.path;
					}
				}
				result.push(oasDef);
			}
		}
		const resourceAnnotations = [];
		Oas20RootConverter.importAnnotations(oasDefs, resourceAnnotations, this.model);
		if (resourceAnnotations.hasOwnProperty('annotations'))
			this.model.resourceAnnotations = resourceAnnotations;

		return result;
	}
	
	_import(oasDef) {
		const attrIdMap = {};
		
		const attrIdSkip = helper.getValidMethods;
		const annotationPrefix = oasHelper.getAnnotationPrefix;
		const model = Oas20ResourceConverter.copyObjectFrom(oasDef, attrIdMap, attrIdSkip, annotationPrefix);
		const definitionConverter = new Oas20DefinitionConverter();
		
		if (oasDef.hasOwnProperty('parameters')) {
			if (_.isArray(oasDef.parameters) && !_.isEmpty(oasDef.parameters)) {
				const parameters = [];
				const is = [];
				for (const id in oasDef.parameters) {
					if (!oasDef.parameters.hasOwnProperty(id)) continue;
					
					let value = (oasHelper.isFilePath(oasDef.parameters[id]) && this.dereferencedAPI) ? this.dereferencedAPI[this.currentPath].parameters[id] : oasDef.parameters[id];
					if (value.in === 'header') continue;
					if (value.hasOwnProperty('$ref')) {
						const dereferenced = this.dereferencedAPI[this.currentPath].parameters[id];
						if (dereferenced.in === 'path') value = dereferenced;
						else is.push( { name: stringsHelper.computeResourceDisplayName(value.$ref) });
					}
					const parameter = new Parameter();
					parameter._in = value.in;
					parameter.name = value.name;
					Oas20RootConverter.importAnnotations(value, parameter, this.model);
					parameter.definition = definitionConverter._import(value);
					Oas20MethodConverter.importRequired(value, parameter);
					parameters.push(parameter);
				}
				model.parameters = parameters;
				if (!_.isEmpty(is)) model.is = is;
			}
		}
		
		const methodConverter = new Oas20MethodConverter(this.model, this.dereferencedAPI[this.currentPath], this.currentPath);
		model.methods = methodConverter.import(oasDef);
		
		Oas20RootConverter.importAnnotations(oasDef, model, this.model);
		
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