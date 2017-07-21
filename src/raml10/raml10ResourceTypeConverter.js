// @flow
const _ = require('lodash');
const ResourceType = require('../model/resourceType');
const Resource = require('../model/resource');
const Method = require('../model/method');
const Parameter = require('../model/parameter');
const Converter = require('../model/converter');
const Raml10DefinitionConverter = require('../raml10/raml10DefinitionConverter');
const Raml10ResourceConverter = require('../raml10/raml10ResourceConverter');
const Raml10MethodConverter = require('../raml10/raml10MethodConverter');
const helper = require('../helpers/converter');
const ramlHelper = require('../helpers/raml');
 
class Raml10ResourceTypeConverter extends Converter {
	
	export(models:ResourceType[]) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		for (let i = 0; i < models.length; i++) {
			const model: ResourceType = models[i];
			result[model.name] = this._export(model);
		}
		
		return result;
	}
	
	// exports 1 resource type definition
	_export(model:ResourceType) {
		const attrIdMap = {};

		const attrIdSkip = ['name', 'parameters', 'methods', 'resource'];
		const ramlDef = Raml10ResourceTypeConverter.createRamlDef(model, attrIdMap, attrIdSkip);
		const resourceConverter = new Raml10ResourceConverter(this.model);
		
		if (model.hasOwnProperty('resource') && !_.isEmpty(model.resource)) {
			const resourceModel: Resource = model.resource;
			const resource = resourceConverter._export(resourceModel).result;
			for (const id in resource) {
				if (!resource.hasOwnProperty(id)) continue;
				
				const value = resource[id];
				for (const index in value) {
					if (!value.hasOwnProperty(index)) continue;
					
					delete value.displayName;
				}
				ramlDef[id] = value;
			}
		}
		
		return ramlDef;
	}
	
	static createRamlDef(resourceType, attrIdMap, attrIdSkip) {
		const result = {};
		
		_.assign(result, resourceType);
		attrIdSkip.map(id => {
			delete result[id];
		});
		_.keys(attrIdMap).map(id => {
			result[attrIdMap[id]] = result[id];
			delete result[id];
		});
		
		return result;
	}
	
	static createResourceType(ramlDef, attrIdMap, attrIdSkip) {
		const object = {};
		
		_.entries(ramlDef).map(([key, value]) => {
			if (attrIdSkip.indexOf(key) < 0 && !key.startsWith('x-')) {
				object[attrIdMap.hasOwnProperty(key) ? attrIdMap[key] : key] = value;
			}
		});
		const result = new ResourceType();
		_.assign(result, object);
		
		return result;
	}
	
	import(ramlDefs:any) {
		let result: ResourceType[] = [];
		if (_.isEmpty(ramlDefs)) return result;

		helper.removePropertiesFromObject(ramlDefs, ['typePropertyKind', 'structuredExample']);
		for (const id in ramlDefs) {
			if (!ramlDefs.hasOwnProperty(id)) continue;
			
			const ramlDef = ramlDefs[id];
			const resourceType: ResourceType = this._import(ramlDef);
			result.push(resourceType);
		}
		
		return result;
	}
	
	// imports 1 resource type definition
	_import(ramlDef:any) {
		const attrIdMap = {};
		
		const attrIdSkip = ['description', 'displayName', 'uriParameters'];
		const validMethods = helper.getValidMethods;
		const definitionConverter = new Raml10DefinitionConverter();
		const methodConverter = new Raml10MethodConverter();
		const model = Raml10ResourceTypeConverter.createResourceType(ramlDef[Object.keys(ramlDef)[0]], attrIdMap, attrIdSkip.concat(validMethods));
		const isRaml08Version = ramlHelper.isRaml08Version(this.version);
		
		const resource = new Resource();
		if (!_.isEmpty(ramlDef)) {
			const methods: Method[] = [];
			const def = ramlDef[Object.keys(ramlDef)[0]];
			
			for (const id in def) {
				if (!def.hasOwnProperty(id) || !validMethods.includes(id)) continue;
				
				const value = def[id];
				const method: Method = methodConverter._import(value)
				methods.push(method);
			}
			if (!_.isEmpty(methods)) resource.methods = methods;
			if (def.hasOwnProperty('description')) resource.description = def.description;
			if (def.hasOwnProperty('displayName')) resource.displayName = def.displayName;
			if (def.hasOwnProperty('uriParameters')) {
				if (!_.isEmpty(def.uriParameters)) {
					const modelParameters: Parameter[] = [];
					for (const id in def.uriParameters) {
						if (!def.uriParameters.hasOwnProperty(id)) continue;
						
						const value = def.uriParameters[id];
						const parameter = new Parameter();
						parameter._in = 'path';
						parameter.name = isRaml08Version ? value.name : id;
						parameter.definition = definitionConverter._import(value);
						if (parameter.definition != null && !parameter.definition.hasOwnProperty('required')) parameter.definition.required = true;
						modelParameters.push(parameter);
					}
					resource.parameters = modelParameters;
				}
			}
			if (!_.isEmpty(resource)) model.resource = resource;
		}
		
		return model;
	}
}

module.exports = Raml10ResourceTypeConverter;