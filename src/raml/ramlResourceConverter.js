// @flow
const _ = require('lodash');
const ConverterModel = require('oas-raml-converter-model');
const Root = ConverterModel.Root;
const Resource = ConverterModel.Resource;
const Method = ConverterModel.Method;
const Body = ConverterModel.Body;
const Header = ConverterModel.Header;
const SecurityRequirement = ConverterModel.SecurityRequirement;
const Parameter = ConverterModel.Parameter;
const Item = ConverterModel.Item;
const Converter = require('../converters/converter');
const RamlMethodConverter = require('../raml/ramlMethodConverter');
const RamlAnnotationConverter = require('../raml/ramlAnnotationConverter');
const ParameterConverter = require('../common/parameterConverter');
const helper = require('../helpers/converter');
const ramlHelper = require('../helpers/raml');

class RamlResourceConverter extends Converter {
	
	export(models:Resource[]) {
		let result = {};
		if (_.isEmpty(models)) return result;
		
		for (let i = 0; i < models.length; i++) {
			const model: Resource = models[i];
			const path: ?string = model.path;
			if (path && path.startsWith('/')) {
				const paths: string[] = path.split('/');
				paths.shift();
				const relativePath: string = path.substring(path.lastIndexOf('/'));
				const resource = this.mapResource(model, result, paths, relativePath).result;
				if (resource) result = resource;
			}
		}
		
		return RamlResourceConverter.reduceResources(result);
	}

	mapResource(model:Resource, result:any, paths:string[], relativePath:string) {
		let path: string = paths.shift();
		path = '/' + path;
		if (!_.includes(Object.keys(result), path)) {
			if (path !== relativePath) {
				const value = this.mapResource(model, {}, paths, relativePath);
				result[path] = value.result;
				if (!_.isEmpty(value.uriParameters)) {
					const uriParameters = result[path].uriParameters ? result[path].uriParameters : {};
					RamlResourceConverter.mapUriParameters(value.uriParameters, path, uriParameters, result[path]);
				}
				return {result: result, uriParameters: value.uriParameters};
			} else {
				const value = this._export(model);
				result[path] = value.result;
				return {result: result, uriParameters: value.uriParameters};
			}
		} else if (paths.length > 0) {
			const value = this.mapResource(model, result[path], paths, relativePath);
			if (!_.isEmpty(value.uriParameters)) {
				const uriParameters = result[path].uriParameters ? result[path].uriParameters : {};
				RamlResourceConverter.mapUriParameters(value.uriParameters, path, uriParameters, result[path]);
			}
			return {result: result, uriParameters: value.uriParameters};
		} else return {result: undefined};
	}

	static mapUriParameters(source:any, path:?string, uriParameters:any, target:any) {
		const relativePath = path ? path.substring(path.lastIndexOf('/')) : '';
		for (const paramName in source) {
			if (!source.hasOwnProperty(paramName)) continue;

			const param = source[paramName];
			if (!path || (relativePath.includes(paramName) && !Object.keys(uriParameters).includes(paramName))) {
				uriParameters[paramName] = param;
				delete source[paramName];
			}
		}
		if (!_.isEmpty(uriParameters)) {
			if (target.uriParameters)
				_.merge(target.uriParameters, uriParameters);
			else
				target.uriParameters = uriParameters;
		}
	}
	
	// exports 1 resource definition
	_export(model:Resource) {
		const attrIdMap = {};

		const attrIdSkip = ['path', 'relativePath', 'methods', 'resources', 'parameters', 'securedBy', 'annotations', 'resourceType', 'error', 'warning'];
		const ramlDef = RamlResourceConverter.createRamlDef(model, attrIdMap, attrIdSkip);
		const methodConverter = new RamlMethodConverter(this.model, this.annotationPrefix, this.def);

		if (model.hasOwnProperty('is') && model.is) {
			const isList: Item[] = model.is;
			if (_.isArray(isList) && !_.isEmpty(isList)) {
				const is: any[] = [];
				for (let i = 0; i < isList.length; i++) {
					const value: Item = isList[i];
					let trait: any;
					if (value.value) {
						trait = {};
						trait[value.name] = value.value;
					}
					else trait = value.name;
					is.push(trait);
				}
				ramlDef.is = is;
			}
		}

		if (model.hasOwnProperty('resourceType') && model.resourceType) {
			const resourceTypes: Item[] = model.resourceType;
			if (_.isArray(resourceTypes) && !_.isEmpty(resourceTypes)) {
				const types: any[] = [];
				for (let i = 0; i < resourceTypes.length; i++) {
					const value: Item = resourceTypes[i];
					let type: any;
					if (value.value) {
						type = {};
						type[value.name] = value.value;
					}
					else type = value.name;
					types.push(type);
				}
				ramlDef.type = types.length === 1 ? types[0] : types;
			}
		}

		const parameters: Parameter[] = model.parameters ? model.parameters : [];
		const inheritedParameters = RamlResourceConverter.exportInheritedParameters(parameters);
		const uriParameters: any = {};
		RamlResourceConverter.exportUriParameters(model, uriParameters, this.model, this.annotationPrefix, this.def);

		if (model.hasOwnProperty('methods') && model.methods) {
			const methodsModel: Method[] = model.methods;
			if (_.isArray(methodsModel) && !_.isEmpty(methodsModel)) {
				for (let i = 0; i < methodsModel.length; i++) {
					const method: Method = methodsModel[i];
					for (const property in inheritedParameters) {
						if (!inheritedParameters.hasOwnProperty(property)) continue;

						const props: any[] = inheritedParameters[property];
						if (!_.isEmpty(props)) {
							switch (property) {
								case 'bodies': {
									const bodies: Body[] = method.bodies ? method.bodies : [];
									method.bodies = _.concat(bodies, props);
									break;
								}
								case 'formBodies': {
									const formBodies: Body[] = method.formBodies ? method.formBodies : [];
									method.formBodies = _.concat(formBodies, props);
									break;
								}
								case 'parameters': {
									const parameters: Parameter[] = method.parameters ? method.parameters : [];
									method.parameters = _.concat(parameters, props);
									break;
								}
								case 'headers': {
									const headers: Header[] = method.headers ? method.headers : [];
									method.headers = _.concat(headers, props);
									break;
								}
							}
						}
					}
					RamlResourceConverter.exportUriParameters(method, uriParameters, this.model, this.annotationPrefix, this.def);
				}
				const methods = methodConverter.export(methodsModel);
				for (const id in methods) {
					if (!methods.hasOwnProperty(id)) continue;
					
					ramlDef[id] = methods[id];
				}
			}
		}

		if (!_.isEmpty(uriParameters)) {
			RamlResourceConverter.mapUnusedUriParameters(uriParameters, model.path, ramlDef);
			RamlResourceConverter.mapUriParameters(uriParameters, model.relativePath, {}, ramlDef);
		}
		
		if (model.hasOwnProperty('resources') && model.resources) {
			const resources: Resource[] = model.resources;
			if (_.isArray(resources) && !_.isEmpty(resources)) {
				for (let i = 0; i < resources.length; i++) {
					const value: Resource = resources[i];
					const relativePath: ?string = value.relativePath;
					if (relativePath != null) ramlDef[relativePath] = this._export(value).result;
				}
			}
		}
		
		RamlAnnotationConverter.exportAnnotations(this.model, this.annotationPrefix, this.def, model, ramlDef);

		if (model.hasOwnProperty('securedBy')) {
			ramlDef.securedBy = RamlMethodConverter.exportSecurityRequirements(model);
		}

		return {result: ramlDef, uriParameters: uriParameters};
	}

	static mapUnusedUriParameters(uriParameters:any, absolutePath:?string, target:any) {
		const unusedUriParameters = {};
		for (const paramName in uriParameters) {
			if (!uriParameters.hasOwnProperty(paramName)) continue;

			if (!absolutePath || !absolutePath.includes(paramName)) {
				unusedUriParameters[paramName] = uriParameters[paramName];
				delete uriParameters[paramName];
			}
		}
		if (!_.isEmpty(unusedUriParameters)) {
			if (target.uriParameters)
				_.merge(target.uriParameters, unusedUriParameters);
			else
				target.uriParameters = unusedUriParameters;
		}
	}

	static exportInheritedParameters(params:any[]) {
		const bodies: Body[] = [];
		const formBodies: Body[] = [];
		const parameters: Parameter[] = [];
		const headers: Header[] = [];
		const inheritedParameters = {
			bodies: bodies,
			formBodies: formBodies,
			parameters: parameters,
			headers: headers
		};
		for (let i = 0; i < params.length; i++) {
			const _in: string = params[i]._in;
			if (_in === 'path')
				continue;
			else if (_in === 'body') {
				const body: Body = params[i];
				inheritedParameters.bodies.push(body);
			} else if (_in === 'formData') {
				const body: Body = params[i];
				inheritedParameters.formBodies.push(body);
			} else if (_in === 'query') {
				const param: Parameter = params[i];
				inheritedParameters.parameters.push(param);
			} else if (_in === 'header') {
				const header: Header = params[i];
				inheritedParameters.headers.push(header);
			}
			delete params[i];
		}
		
		return inheritedParameters;
	}
	
	static exportUriParameters(object:any, uriParameters:any, model:Root, annotationPrefix:string, ramlDef:any) {
		if (object.hasOwnProperty('parameters')) {
			if (_.isArray(object.parameters) && !_.isEmpty(object.parameters)) {
				const parameterConverter = new ParameterConverter(model, annotationPrefix, ramlDef, 'path');
				const parameters = parameterConverter.export(object.parameters);
				if (!_.isEmpty(parameters)) _.assign(uriParameters, parameters);
			}
		}
	}

	static reduceResources(resource:any) {
		for (const node in resource) {
			if (!resource.hasOwnProperty(node)) continue;

			if (node.startsWith('/')) {
				resource[node] = RamlResourceConverter.reduceResources(resource[node]);
				const resourceNodes:string[] = Object.keys(resource[node]);
				if (resourceNodes.length === 1 && resourceNodes[0].startsWith('/')) {
					resource[node + resourceNodes[0]] = resource[node][resourceNodes[0]];
					delete resource[node];
				}
			}
		}

		return resource;
	}

	static createRamlDef(resource:Resource, attrIdMap, attrIdSkip) {
		const result = {};
		
		_.assign(result, resource);
		attrIdSkip.map(id => {
			delete result[id];
		});
		_.keys(attrIdMap).map(id => {
			const value = result[id];
			if (value != null) {
				result[attrIdMap[id]] = result[id];
				delete result[id];
			}
		});
		
		return result;
	}
	
	static createResource(ramlDef, attrIdMap, attrIdSkip) {
		const object = {};
		
		_.entries(ramlDef).map(([key, value]) => {
			if (attrIdSkip.indexOf(key) < 0 && !key.startsWith('x-')) {
				object[attrIdMap.hasOwnProperty(key) ? attrIdMap[key] : key] = value;
			}
		});
		const result = new Resource();
		_.assign(result, object);
		
		return result;
	}

	import(ramlDefs:any) {
		let result: Resource[] = [];
		if (_.isEmpty(ramlDefs)) return result;

		helper.removePropertiesFromObject(ramlDefs,['typePropertyKind', 'fixedFacets']);
		for (const id in ramlDefs) {
			if (!ramlDefs.hasOwnProperty(id)) continue;
			
			const ramlDef = ramlDefs[id];
			const resource: Resource = this._import(ramlDef);
			result.push(resource);
			if (ramlDef.hasOwnProperty('resources') && _.isArray(ramlDef.resources)) {
				const models: Resource[] = this.import(ramlDef.resources);
				result = result.concat(models);
			}
		}
		
		return result;
	}

	// imports 1 resource definition
	_import(ramlDef:any) {
		const attrIdMap = {
			'relativeUri': 'relativePath'
		};

		const attrIdSkip = ['type', 'methods', 'resources', 'relativeUriPathSegments', 'uriParameters', 'baseUriParameters', 
			'annotations', 'absoluteUri', 'is', 'securedBy', 'sourceMap'];
		const model: Resource = RamlResourceConverter.createResource(ramlDef, attrIdMap, attrIdSkip);
		const isRaml08Version: boolean = ramlHelper.isRaml08Version(this.version);

		if (ramlDef.hasOwnProperty('is') && _.isArray(ramlDef.is)) {
			const is: Item[] = [];
			for (const id in ramlDef.is) {
				if (!ramlDef.is.hasOwnProperty(id)) continue;
	
				const value = ramlDef.is[id];
				if (typeof value === 'string') {
					const item = new Item();
					item.name = value;
					is.push(item);
				} else if (typeof value === 'object') {
					const name: string = Object.keys(value)[0];
					const item = new Item();
					item.name = name;
					item.value = value[name];
					is.push(item);
				}
			}
			model.is = is;
		}

		if (ramlDef.hasOwnProperty('absoluteUri')) {
			if (this.model.baseUri){
				let baseUri: string = this.model.baseUri.uri;
				if (baseUri.endsWith('/')) baseUri = baseUri.substring(0, baseUri.lastIndexOf('/'));
				model.path = ramlDef.absoluteUri.replace(baseUri, '');
			} else {
				model.path = ramlDef.absoluteUri;
			}
		}

		if (ramlDef.hasOwnProperty('uriParameters') && !_.isEmpty(ramlDef.uriParameters)) {
			const parameterConverter = new ParameterConverter(this.model, this.annotationPrefix, this.def, '');
			const modelParameters: Parameter[] = [];
			for (const id in ramlDef.uriParameters) {
				if (!ramlDef.uriParameters.hasOwnProperty(id)) continue;
				
				const value = ramlDef.uriParameters[id];
				const parameter: Parameter = parameterConverter._import(value);
				if (!value.hasOwnProperty('type') && parameter.definition != null) delete parameter.definition.internalType;
				parameter._in = 'path';
				modelParameters.push(parameter);
			}
			model.parameters = modelParameters;
		}
		
		if (isRaml08Version && ramlDef.hasOwnProperty('baseUriParameters')) {
			const parameterConverter = new ParameterConverter(this.model, this.annotationPrefix, this.def, '');
			for (const id in ramlDef.baseUriParameters) {
				if (!ramlDef.baseUriParameters.hasOwnProperty(id)) continue;
				
				const parameters: Parameter = parameterConverter._import(ramlDef.baseUriParameters[id]);
				this.model.baseUriParameters.push(parameters);
			}
		}
		
		if (ramlDef.hasOwnProperty('type')) {
			let resourceTypes: Item[] = [];
			if (typeof ramlDef.type === 'string') {
				const item = new Item();
				item.name = ramlDef.type;
				resourceTypes.push(item);
			} else if (typeof ramlDef.type === 'object') {
				for (const name in ramlDef.type) {
					const item = new Item();
					item.name = name;
					item.value = ramlDef.type[name];
					resourceTypes.push(item);
				}
			}
			model.resourceType = resourceTypes;
		}
		
		if (ramlDef.hasOwnProperty('methods')) {
			if (_.isArray(ramlDef.methods) && !_.isEmpty(ramlDef.methods)) {
				const methodConverter = new RamlMethodConverter(this.model, null, this.def);
				methodConverter.version = this.version;
				const methods: Method[] = methodConverter.import(ramlDef.methods);
				for (let i = 0; i < methods.length; i++) {
					const method: Method = methods[i];
					method.path = model.path;
				}
				model.methods = methods;
			}
		}
		
		RamlAnnotationConverter.importAnnotations(ramlDef, model, this.model);

		if (ramlDef.hasOwnProperty('securedBy')) {
			RamlResourceConverter.addInheritedSecuredBy(ramlDef, ramlDef.securedBy);
			const securedBy: SecurityRequirement[] = RamlMethodConverter.importSecurityRequirements(ramlDef);
			model.securedBy = securedBy;
		}
		
		return model;
	}

	static addInheritedSecuredBy(object:any, securityRequirements:any) {
		if (object.hasOwnProperty('resources')) {
			object.resources.map( resource => {
				if (resource.hasOwnProperty('methods')) {
					resource.methods.map( method => {
						if (method.hasOwnProperty('securedBy')) {
							const securedBy = method.securedBy;
							securityRequirements.map( security => {
								if (!_.includes(securedBy, security)) {
									securedBy.push(security);
								}
							});
							method.securedBy = securedBy;
						} else {
							method.securedBy = securityRequirements;
						}
					});
				}
				RamlResourceConverter.addInheritedSecuredBy(resource, securityRequirements);
			});
		}
	}
}

module.exports = RamlResourceConverter;
