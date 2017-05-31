const _ = require('lodash');
const ResourceType = require('../model/resourceType');
const Parameter = require('../model/parameter');
const Converter = require('../model/converter');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');
const Raml10ResourceConverter = require('../raml10/Raml10ResourceConverter');
const Raml10MethodConverter = require('../raml10/Raml10MethodConverter');
const helper = require('../helpers/converter');
 
class Raml10ResourceTypeConverter extends Converter {
	
	export(models) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		models.map(model => {
			result[model.name] = this._export(model);
		});
		
		return result;
	}
	
	// exports 1 resource type definition
	_export(model) {
		const attrIdMap = {};

		const attrIdSkip = ['name', 'parameters', 'methods', 'resource'];
		const ramlDef = Raml10ResourceTypeConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);
		const resourceConverter = new Raml10ResourceConverter(this.model);
		
		if (model.hasOwnProperty('resource') && !_.isEmpty(model.resource)) {
			const resource = resourceConverter._export(model.resource).result;
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
	
	static copyObjectFrom(object, attrIdMap, attrIdSkip) {
		const result = new ResourceType();
		
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

		helper.removePropertiesFromObject(ramlDefs, ['typePropertyKind', 'structuredExample']);
		for (const id in ramlDefs) {
			if (!ramlDefs.hasOwnProperty(id)) continue;
			
			const ramlDef = ramlDefs[id];
			result.push(this._import(ramlDef));
		}
		return result;
	}
	
	// imports 1 resource type definition
	_import(ramlDef) {
		const attrIdMap = {};
		
		const attrIdSkip = ['description', 'displayName', 'uriParameters'];
		const validMethods = helper.getValidMethods;
		const definitionConverter = new Raml10DefinitionConverter();
		const methodConverter = new Raml10MethodConverter();
		const model = Raml10ResourceTypeConverter.copyObjectFrom(ramlDef[Object.keys(ramlDef)[0]], attrIdMap, attrIdSkip.concat(validMethods));
		
		const resource = {};
		if (!_.isEmpty(ramlDef)) {
			const methods = [];
			const def = ramlDef[Object.keys(ramlDef)[0]];
			
			for (const id in def) {
				if (!def.hasOwnProperty(id) || !validMethods.includes(id)) continue;
				
				const value = def[id];
				methods.push(methodConverter._import(value));
			}
			if (!_.isEmpty(methods)) resource.methods = methods;
			if (def.hasOwnProperty('description')) resource.description = def.description;
			if (def.hasOwnProperty('displayName')) resource.displayName = def.displayName;
			if (def.hasOwnProperty('uriParameters')) {
				if (!_.isEmpty(def.uriParameters)) {
					const modelParameters = [];
					for (const id in def.uriParameters) {
						if (!def.uriParameters.hasOwnProperty(id)) continue;
						
						const value = def.uriParameters[id];
						const parameter = new Parameter();
						parameter._in = 'path';
						parameter.name = id;
						parameter.definition = definitionConverter._import(value);
						if (!parameter.definition.hasOwnProperty('required')) parameter.definition.required = true;
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