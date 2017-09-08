// @flow
const _ = require('lodash');
const ConverterModel = require('oas-raml-converter-model');
const Resource = ConverterModel.Resource;
const Root = ConverterModel.Root;
const Method = ConverterModel.Method;
const Definition = ConverterModel.Definition;
const Parameter = ConverterModel.Parameter;
const Item = ConverterModel.Item;
const Converter = require('../converters/converter');
const Oas20RootConverter = require('../oas20/oas20RootConverter');
const Oas20DefinitionConverter = require('../oas20/oas20DefinitionConverter');
const Oas20MethodConverter = require('../oas20/oas20MethodConverter');
const helper = require('../helpers/converter');
const stringsHelper = require('../utils/strings');
const oasHelper = require('../helpers/oas20');

class Oas20ResourceConverter extends Converter {

	constructor(model:Root, dereferencedAPI:any, def:any) {
		super(model, '', def);
		this.dereferencedAPI = dereferencedAPI;
	}
	
	export(models:Resource[]) {
		const result = {};
		if (!models || _.isEmpty(models)) return result;
		
		for (let i = 0; i < models.length; i++) {
			const model: Resource = models[i];
			const parents: Resource[] = Oas20ResourceConverter.getParents(model.path, models);
			if (!_.isEmpty(parents)) {
				const parent: Resource = parents[0];
				const parameters: Parameter[] = model.parameters ? model.parameters : [];
				const modelParameters: string[] = parameters.map(function(parameter) {
					return parameter.name;
				});
				if (parent.hasOwnProperty('parameters') && parent.parameters) {
					const parentParams: Parameter[] = parent.parameters;
					for (let j = 0; j < parentParams.length; j++) {
						const parameter: Parameter = parentParams[j];
						if (!modelParameters.includes(parameter.name)) {
							parameters.push(parameter);
							model.parameters = parameters;
						}
					}
				}
			}
			const oasDef = this._export(model);
			let hasNestedResources: boolean = false;
			for (let i = 0; i < models.length; i++) {
				const resource: Resource = models[i];
				if (!hasNestedResources && resource.path && model.path) hasNestedResources = resource.path.startsWith(model.path) && resource.path !== model.path;
			}
			const hasOnlyUriParams: boolean = oasDef.hasOwnProperty('parameters') && oasDef.parameters.filter(param => { return param.in !== 'path'; }).length === 0;
			const ignore: boolean = hasNestedResources && _.keys(oasDef).length === 1 && hasOnlyUriParams;
			if ((!(_.isEmpty(oasDef) || ignore) || model.hasOwnProperty('securedBy')) && model.path) {
				result[model.path] = oasDef;
			}
		}
		
		return result;
	}
	
	// exports 1 resource definition
	_export(model:Resource) {
		const attrIdMap = {};
		
		const attrIdSkip = ['path', 'relativePath', 'resourceType', 'description', 'displayName', 'methods', 'resources', 'parameters', 'is', 'securedBy', 'annotations'];
		const oasDef = Oas20ResourceConverter.createOasDef(model, attrIdMap, attrIdSkip);
		const definitionConverter = new Oas20DefinitionConverter();
		
		if (model.hasOwnProperty('methods') && model.methods) {
			const methodsModel: Method[] = model.methods;
			if (_.isArray(methodsModel) && !_.isEmpty(methodsModel)) {
				const methodConverter = new Oas20MethodConverter(this.model, null, model.path, this.def);
				const methods = methodConverter.export(methodsModel);
				for (const id in methods) {
					if (!methods.hasOwnProperty(id)) continue;
					
					oasDef[id] = methods[id];
				}
			}
		}
		
		if (model.hasOwnProperty('parameters') && model.parameters) {
			const paramsModel: Parameter[] = model.parameters;
			if (_.isArray(paramsModel) && !_.isEmpty(paramsModel)) {
				const parameters = [];
				for (let i = 0; i < paramsModel.length; i++) {
					const value: Parameter = paramsModel[i];
					if (model.path && !model.path.includes(value.name)) continue;
					const definition: ?Definition = value.definition;
					const parameter = Object.assign({}, definitionConverter._export(definition));
					parameter.in = value._in;
					parameter.name = value.name;
					if (!parameter.hasOwnProperty('description') && value.hasOwnProperty('displayName')) parameter.description = value.displayName;
					parameter.required = true;
					if (!parameter.hasOwnProperty('type')) parameter.type = 'string';
					if (parameter.$ref) delete parameter.$ref;
					if (parameter.type === 'array' && !parameter.hasOwnProperty('items')) parameter.items = {type: 'string'};
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
	
	static getParents(path:?string, models:Resource[]) {
		const parentAbsolutePath: string = Oas20ResourceConverter.getParentAbsolutePath(path);
		let parents: Resource[] = models.filter(function(model) {
			return model.path === parentAbsolutePath;
		});
		if (!_.isEmpty(parentAbsolutePath)) parents = parents.concat(Oas20ResourceConverter.getParents(parentAbsolutePath, models));
		
		return parents;
	}

	static createOasDef(resource:Resource, attrIdMap, attrIdSkip) {
		const result = {};
		
		_.assign(result, resource);
		attrIdSkip.map(id => {
			delete result[id];
		});
		_.keys(attrIdMap).map(id => {
			const value = result[id];
			if (value !== undefined) {
				result[attrIdMap[id]] = result[id];
				delete result[id];
			}
		});
		
		return result;
	}
	
	static createResource(oasDef, attrIdMap, attrIdSkip, annotationPrefix) {
		const object = {};
		
		_.entries(oasDef).map(([key, value]) => {
			if (attrIdSkip.indexOf(key) < 0 && !key.startsWith('x-') && !key.startsWith(annotationPrefix)) {
				object[attrIdMap.hasOwnProperty(key) ? attrIdMap[key] : key] = value;
			}
		});
		const result = new Resource();
		_.assign(result, object);
		
		return result;
	}
	
	import(oasDefs:any) {
		const result: Resource[] = [];
		if (_.isEmpty(oasDefs)) return result;

		for (const id in oasDefs) {
			if (!oasDefs.hasOwnProperty(id)) continue;

			if (!id.startsWith('x-')) {
				this.currentPath = id;
				const oasDef = oasDefs[id];
				const resource: Resource = this._import(oasDef);
				resource.path = id;
				resource.relativePath = Oas20ResourceConverter.getRelativePath(id);
				if (resource.hasOwnProperty('methods') && resource.methods) {
					const methods: Method[] = resource.methods;
					for (let i = 0; i < methods.length; i++) {
						const method: Method = methods[i];
						method.path = resource.path;
					}
				}
				result.push(resource);
			}
		}
		const resourceAnnotations = new Resource();
		Oas20RootConverter.importAnnotations(oasDefs, resourceAnnotations, this.model);
		if (resourceAnnotations.hasOwnProperty('annotations'))
			this.model.resourceAnnotations = resourceAnnotations;

		return result;
	}
	
	_import(oasDef:any) {
		const attrIdMap = {};
		
		const attrIdSkip = helper.getValidMethods;
		const annotationPrefix = oasHelper.getAnnotationPrefix;
		const model: Resource = Oas20ResourceConverter.createResource(oasDef, attrIdMap, attrIdSkip, annotationPrefix);
		const definitionConverter = new Oas20DefinitionConverter();
		
		if (oasDef.hasOwnProperty('parameters')) {
			if (_.isArray(oasDef.parameters) && !_.isEmpty(oasDef.parameters)) {
				const parameters: Parameter[] = [];
				const is: Item[] = [];
				for (const id in oasDef.parameters) {
					if (!oasDef.parameters.hasOwnProperty(id)) continue;
					
					let value = (oasHelper.isFilePath(oasDef.parameters[id]) && this.dereferencedAPI) ? this.dereferencedAPI[this.currentPath].parameters[id] : oasDef.parameters[id];
					if (value.in === 'header') continue;
					if (value.hasOwnProperty('$ref')) {
						const dereferenced = this.dereferencedAPI[this.currentPath].parameters[id];
						if (dereferenced.in === 'path') value = dereferenced;
						else {
							const item = new Item();
							item.name = stringsHelper.computeResourceDisplayName(value.$ref);
							is.push(item);
						}
					}
					const parameter = new Parameter();
					parameter._in = value.in;
					parameter.name = value.name;
					Oas20RootConverter.importAnnotations(value, parameter, this.model);
					const definition: Definition = definitionConverter._import(value);
					parameter.definition = definition;
					Oas20MethodConverter.importRequired(value, parameter);
					parameters.push(parameter);
				}
				model.parameters = parameters;
				if (!_.isEmpty(is)) model.is = is;
			}
		}
		
		const methodConverter = new Oas20MethodConverter(this.model, this.dereferencedAPI[this.currentPath], this.currentPath, this.def);
		const methods: Method[] = methodConverter.import(oasDef);
		model.methods = methods;
		
		Oas20RootConverter.importAnnotations(oasDef, model, this.model);
		
		return model;
	}
	
	static getParentPath(path:?string) {
		if (!path) return '';
		const absoluteParent: string = path.substring(0, path.lastIndexOf('/'));
		return Oas20ResourceConverter.getRelativePath(absoluteParent);
	}
	
	static getParentAbsolutePath(path:?string) {
		if (!path) return '';
		const parentPath: string = Oas20ResourceConverter.getParentPath(path);
		return path.substring(0, path.indexOf(parentPath)) + parentPath;
	}
	
	static getRelativePath(path:string) {
		return path.substring(path.lastIndexOf('/'));
	}
	
}

module.exports = Oas20ResourceConverter;
