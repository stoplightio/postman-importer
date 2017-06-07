const _ = require('lodash');
const Resource = require('../model/resource');
const Converter = require('../model/converter');
const Raml10RootConverter = require('../raml10/Raml10RootConverter');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');
const Raml10MethodConverter = require('../raml10/Raml10MethodConverter');
const ParameterConverter = require('../common/ParameterConverter');
const Raml10AnnotationConverter = require('../raml10/Raml10AnnotationConverter');
const Raml10CustomAnnotationConverter = require('../raml10/Raml10CustomAnnotationConverter');
const helper = require('../helpers/converter');

class Raml10ResourceConverter extends Converter {
	
	constructor(model, annotationPrefix, ramlDef) {
		super(model);
		this.annotationPrefix = annotationPrefix;
		this.ramlDef = ramlDef;
	}
	
	export(models) {
		let result = {};
		if (_.isEmpty(models)) return result;

		models.map(model => {
			const paths = model.path.split('/');
			paths.shift();
			const relativePath = model.path.substring(model.path.lastIndexOf('/'));
			result = this.mapResource(model, result, paths, relativePath).result;
		});
		return result;
	}

	mapResource(model, result, paths, relativePath) {
		let path = paths.shift();
		path = '/' + path;
		if (!_.includes(Object.keys(result), path)) {
			if (path !== relativePath) {
				const value = this.mapResource(model, {}, paths, relativePath);
				result[path] = value.result;
				if (!_.isEmpty(value.uriParameters)) {
					const uriParameters = result[path].uriParameters ? result[path].uriParameters : {};
					Raml10ResourceConverter.mapUriParameters(value.uriParameters, path, uriParameters, result[path]);
				}
				return {result: result, uriParameters: value.uriParameters};
			} else {
				const value = this._export(model);
				result[path] = value.result;
				return {result: result, uriParameters: value.uriParameters};
			}
		} else {
			const value = this.mapResource(model, result[path] , paths, relativePath);
			if (!_.isEmpty(value.uriParameters)) {
				const uriParameters = result[path].uriParameters ? result[path].uriParameters : {};
				Raml10ResourceConverter.mapUriParameters(value.uriParameters, path, uriParameters, result[path]);
			}
			return {result: result, uriParameters: value.uriParameters};
		}
	}

	static mapUriParameters(source, path, uriParameters, target) {
		const relativePath = path ? path.substring(path.lastIndexOf('/')) : "";
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
	_export(model) {
		const attrIdMap = {};

		const attrIdSkip = ['path', 'relativePath', 'methods', 'resources', 'parameters', 'securedBy', 'annotations', 'resourceType'];
		const ramlDef = Raml10ResourceConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);
		const methodConverter = new Raml10MethodConverter(this.model, this.annotationPrefix, this.ramlDef);

		if (model.hasOwnProperty('is')) {
			if (_.isArray(model.is) && !_.isEmpty(model.is)) {
				const is = [];
				for (const id in model.is) {
					if (!model.is.hasOwnProperty(id)) continue;
					
					const value = model.is[id];
					let trait;
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

		if (model.hasOwnProperty('resourceType')) {
			if (_.isArray(model.resourceType) && !_.isEmpty(model.resourceType)) {
				const types = [];
				for (const id in model.resourceType) {
					if (!model.resourceType.hasOwnProperty(id)) continue;
					
					const value = model.resourceType[id];
					let type;
					if (value.value) {
						type = {};
						type[value.name] = value.value;
					}
					else type = value.name;
					types.push(type);
				}
				ramlDef.type = types.length == 1 ? types[0] : types;
			}
		}

		const inheritedParameters = Raml10ResourceConverter.exportInheritedParameters(model.parameters);
		const uriParameters = {};
    Raml10ResourceConverter.exportUriParameters(model, uriParameters, this.model, this.annotationPrefix, this.ramlDef);

		if (model.hasOwnProperty('methods')) {
			if (_.isArray(model.methods) && !_.isEmpty(model.methods)) {
				for (const id in model.methods) {
					if (!model.methods.hasOwnProperty(id)) continue;

					for (const property in inheritedParameters) {
						if (!inheritedParameters.hasOwnProperty(property)) continue;

						if (!_.isEmpty(inheritedParameters[property])) {
							if (model.methods[id][property])
								model.methods[id][property] = _.concat(model.methods[id][property], inheritedParameters[property]);
							else
								model.methods[id][property] = inheritedParameters[property];
						}
					}
					Raml10ResourceConverter.exportUriParameters(model.methods[id], uriParameters, this.model, this.annotationPrefix, this.ramlDef);
				}
				const methods = methodConverter.export(model.methods);
				for (const id in methods) {
					if (!methods.hasOwnProperty(id)) continue;
					
					ramlDef[id] = methods[id];
				}
			}
		}

		if (!_.isEmpty(uriParameters)) {
			Raml10ResourceConverter.mapUnusedUriParameters(uriParameters, model.path, ramlDef);
			Raml10ResourceConverter.mapUriParameters(uriParameters, model.relativePath, {}, ramlDef);
		}
		
		if (model.hasOwnProperty('resources')) {
			if (_.isArray(model.resources) && !_.isEmpty(model.resources)) {
				for (const id in model.resources) {
					if (!model.resources.hasOwnProperty(id)) continue;

					const value = model.resources[id];
					ramlDef[value.relativePath] = this._export(value).result;
				}
			}
		}
		
		Raml10RootConverter.exportAnnotations(this.model, this.annotationPrefix, this.ramlDef, model, ramlDef);

		if (model.hasOwnProperty('securedBy')) {
			ramlDef.securedBy = Raml10MethodConverter.exportSecurityRequirements(model);
		}

		return {result: ramlDef, uriParameters: uriParameters};
	}

	static mapUnusedUriParameters(uriParameters, absolutePath, target) {
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

	static exportInheritedParameters(parameters) {
		const inheritedParameters = {
			bodies: [],
			formBodies: [],
			parameters: [],
			headers: []
		};
		for (const index in parameters) {
			if (!parameters.hasOwnProperty(index)) continue;

			const param = parameters[index];
			if (param._in === 'path')
				continue;
			else if (param._in === 'body')
				inheritedParameters.bodies.push(param);
			else if (param._in === 'formData')
				inheritedParameters.formBodies.push(param);
			else if (param._in === 'query')
				inheritedParameters.parameters.push(param);
			else if (param._in === 'header')
				inheritedParameters.headers.push(param);

			delete parameters[index];
		}
		return inheritedParameters;
	}
	
	static exportUriParameters(object, uriParameters, model, annotationPrefix, ramlDef) {
		if (object.hasOwnProperty('parameters')) {
			if (_.isArray(object.parameters) && !_.isEmpty(object.parameters)) {
				const parameterConverter = new ParameterConverter(model, 'path', annotationPrefix, ramlDef);
				const parameters = parameterConverter.export(object.parameters);
				if (!_.isEmpty(parameters)) _.assign(uriParameters, parameters);
			}
		}
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
			'relativeUri': 'relativePath'
		};

		const attrIdSkip = ['type', 'methods', 'resources', 'relativeUriPathSegments', 'uriParameters', 'annotations', 'absoluteUri', 'is', 'securedBy'];
		const model = Raml10ResourceConverter.copyObjectFrom(ramlDef, attrIdMap, attrIdSkip);

    if (ramlDef.hasOwnProperty('is') && _.isArray(ramlDef.is)) {
			const is = [];
      for (const id in ramlDef.is) {
        if (!ramlDef.is.hasOwnProperty(id)) continue;
	
        const value = ramlDef.is[id];
        if (typeof value === 'string') {
					is.push({ name: value });
				} else if (typeof value === 'object') {
					const name = Object.keys(value)[0];
					is.push({
						name: name,
						value: value[name]
					});
        }
      }
      model.is = is;
    }

		if (ramlDef.hasOwnProperty('absoluteUri')) {
			if (this.model.baseUri){
				let baseUri = this.model.baseUri.uri;
				if (baseUri.endsWith('/')) baseUri = baseUri.substring(0, baseUri.lastIndexOf('/'));
				model.path = ramlDef.absoluteUri.replace(baseUri, "");
			} else {
				model.path = ramlDef.absoluteUri;
			}
		}

		if (ramlDef.hasOwnProperty('uriParameters') && !_.isEmpty(ramlDef.uriParameters)) {
			const parameterConverter = new ParameterConverter();
			const modelParameters = [];
			for (const id in ramlDef.uriParameters) {
				if (!ramlDef.uriParameters.hasOwnProperty(id)) continue;
				
				const value = ramlDef.uriParameters[id];
				const parameter = parameterConverter._import(value);
				if (!value.hasOwnProperty('type')) delete parameter.definition.internalType;
				parameter._in = 'path';
				modelParameters.push(parameter);
			}
			model.parameters = modelParameters;
		}
		
		if (ramlDef.hasOwnProperty('type')) {
			let resourceTypes = [];
    	if (typeof ramlDef.type === 'string') {
				resourceTypes.push({ name: ramlDef.type });
			} else if (typeof ramlDef.type === 'object') {
				for (const name in ramlDef.type) {
					resourceTypes.push({
						name: name,
						value: ramlDef.type[name]
					});
				}
			}
			model.resourceType = resourceTypes;
		}
		
		if (ramlDef.hasOwnProperty('methods')) {
			if (_.isArray(ramlDef.methods) && !_.isEmpty(ramlDef.methods)) {
				const methodConverter = new Raml10MethodConverter(this.model, null, this.ramlDef);
				methodConverter.version = this.version;
				model.methods = methodConverter.import(ramlDef.methods);
				for (const id in model.methods) {
					if (!model.methods.hasOwnProperty(id)) continue;
					
					model.methods[id].path = model.path;
				}
			}
		}
		
		Raml10RootConverter.importAnnotations(ramlDef, model);

		if (ramlDef.hasOwnProperty('securedBy')) {
			Raml10ResourceConverter.addInheritedSecuredBy(ramlDef, ramlDef.securedBy);
			model.securedBy = Raml10MethodConverter.importSecurityRequirements(ramlDef);
		}
		
		return model;
	}

	static addInheritedSecuredBy(object,securityRequirements) {
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
				Raml10ResourceConverter.addInheritedSecuredBy(resource, securityRequirements);
			});
		}
	}
}

module.exports = Raml10ResourceConverter;