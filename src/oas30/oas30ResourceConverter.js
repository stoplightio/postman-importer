// @flow
const _ = require('lodash');

const ConverterModel = require('oas-raml-converter-model');
const Resource = ConverterModel.Resource;
const Root = ConverterModel.Root;
const Method = ConverterModel.Method;
const Definition = ConverterModel.Definition;
const Parameter = ConverterModel.Parameter;
const Converter = require('../converters/converter');
const helper = require('../helpers/converter');

const Oas30DefinitionConverter = require('./oas30DefinitionConverter');
const Oas30MethodConverter = require('./oas30MethodConverter');
const Oas30RootConverter = require('./oas30RootConverter');

const OasParameter = require('./oas30Types').Parameter;

class Oas30ResourceConverter extends Converter {
	constructor(model: Root, dereferencedAPI: any, def: any) {
		super(model, '', def);
		this.dereferencedAPI = dereferencedAPI;
	}

	export(models: Resource[]) {
		const result = {};
		if (!models || _.isEmpty(models)) return result;

		for (let i = 0; i < models.length; i++) {
			const model: Resource = models[i];
			const parents: Resource[] = Oas30ResourceConverter.getParents(model.path, models);
			if (!_.isEmpty(parents)) {
				const parent: Resource = parents[0];
				const parameters: Parameter[] = model.parameters ? model.parameters : [];
				const modelParameters: string[] = parameters.map(function (parameter) {
					return parameter.name;
				});
				if (parent.parameters != null) {
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
			const hasOnlyUriParams: boolean = oasDef.parameters != null && oasDef.parameters.filter(param => {
				return param.in !== 'path';
			}).length === 0;
			const ignore: boolean = hasNestedResources && _.keys(oasDef).length === 1 && hasOnlyUriParams;
			if ((!(_.isEmpty(oasDef) || ignore) || model.securedBy != null) && model.path != null) {
				result[model.path] = oasDef;
			}
		}

		return result;
	}

	// exports 1 resource definition
	_export(model: Resource) {
		const attrIdMap = {};

		const attrIdSkip = [
			'path',
			'relativePath',
			'resourceType',
			'description',
			'displayName',
			'methods',
			'resources',
			'parameters',
			'is',
			'securedBy',
			'annotations'
		];
		const oasDef = Oas30ResourceConverter.createOasDef(model, attrIdMap, attrIdSkip);
		const definitionConverter = new Oas30DefinitionConverter();

		if (model.methods != null) {
			const methodsModel: Method[] = model.methods;
			if (_.isArray(methodsModel) && !_.isEmpty(methodsModel)) {
				const methodConverter = new Oas30MethodConverter(this.model, null, model.path, this.def);
				const methods = methodConverter.export(methodsModel);
				for (const id in methods) {
					if (!methods.hasOwnProperty(id)) continue;

					oasDef[id] = methods[id];
				}
			}
		}

		if (model.parameters != null) {
			const paramsModel: Parameter[] = model.parameters;
			if (_.isArray(paramsModel) && !_.isEmpty(paramsModel)) {
				const parameters = [];
				for (let i = 0; i < paramsModel.length; i++) {
					const value: Parameter = paramsModel[i];
					if (model.path != null && !model.path.includes(value.name) || value.definition == null) continue;
					const definition: ?Definition = value.definition;
					// $ExpectError _in is not precise enough
					const parameter = new OasParameter(value.name, value._in || 'query', value.required || false);
					parameter.schema = Object.assign({}, definitionConverter._export(definition));
					if (parameter.description == null && value.displayName != null) parameter.description = value.displayName;
					if (parameter.schema.required != null) {
						parameter.required = parameter.schema.required;
						delete parameter.schema.required;
					}
					// path vars are always required
					if (value._in === 'path') {
						parameter.required = true;
					}
					if (parameter.schema.type == null && !parameter.schema.$ref) parameter.schema.type = 'string';
					if (parameter.$ref != null) delete parameter.$ref;
					if (parameter.schema.type === 'array' && parameter.schema.items == null) parameter.schema.items = { type: 'string' };
					if (parameter.schema.description) {
						parameter.description = parameter.schema.description;
						delete parameter.schema.description;
					}
					helper.removePropertiesFromObject(parameter, ['example']);
					Oas30RootConverter.exportAnnotations(value, parameter);
					parameters.push(parameter);
				}
				oasDef.parameters = parameters;
			}
		}

		Oas30RootConverter.exportAnnotations(model, oasDef);

		return oasDef;
	}

	static getParents(path: ?string, models: Resource[]) {
		const parentAbsolutePath: string = Oas30ResourceConverter.getParentAbsolutePath(path);
		let parents: Resource[] = models.filter(function (model) {
			return model.path === parentAbsolutePath;
		});
		if (!_.isEmpty(parentAbsolutePath)) parents = parents.concat(Oas30ResourceConverter.getParents(parentAbsolutePath, models));

		return parents;
	}

	static createOasDef(resource: Resource, attrIdMap, attrIdSkip) {
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
				object[attrIdMap[key] != null ? attrIdMap[key] : key] = value;
			}
		});
		const result = new Resource();
		_.assign(result, object);

		return result;
	}

	static getParentPath(path: ?string) {
		if (!path) return '';
		const absoluteParent: string = path.substring(0, path.lastIndexOf('/'));
		return Oas30ResourceConverter.getRelativePath(absoluteParent);
	}

	static getParentAbsolutePath(path: ?string) {
		if (!path) return '';
		const parentPath: string = Oas30ResourceConverter.getParentPath(path);
		return path.substring(0, path.indexOf(parentPath)) + parentPath;
	}

	static getRelativePath(path: string) {
		return path.substring(path.lastIndexOf('/'));
	}
}

module.exports = Oas30ResourceConverter;
