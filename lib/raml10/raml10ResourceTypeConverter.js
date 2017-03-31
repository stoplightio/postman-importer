const _ = require('lodash');
const ResourceType = require('../model/resourceType');
const Parameter = require('../model/parameter');
const Converter = require('../model/converter');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');
const Raml10MethodConverter = require('../raml10/Raml10MethodConverter');
const raml10Helper = require('../helpers/raml10');
 
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

		const attrIdSkip = ['name', 'parameters', 'methods'];
		const ramlDef = Raml10ResourceTypeConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);
		const raml10DefinitionConverter = new Raml10DefinitionConverter();
		const raml10MethodConverter = new Raml10MethodConverter();
		
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
				const methods = raml10MethodConverter.export(model.methods);
				for (const id in methods) {
					if (!methods.hasOwnProperty(id)) continue;
					
					ramlDef[id] = methods[id];
				}
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
		
		raml10Helper.removePropertyFromObject(ramlDefs, 'typePropertyKind');
		raml10Helper.removePropertyFromObject(ramlDefs, 'structuredExample');
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
		
		const attrIdSkip = ['uriParameters'];
		const validMethods = raml10Helper.getValidMethods;
		const raml10DefinitionConverter = new Raml10DefinitionConverter();
		const raml10MethodConverter = new Raml10MethodConverter();
		const model = Raml10ResourceTypeConverter.copyObjectFrom(ramlDef[Object.keys(ramlDef)[0]], attrIdMap, attrIdSkip.concat(validMethods));
		
		if (!_.isEmpty(ramlDef)) {
			const methods = [];
			const def = ramlDef[Object.keys(ramlDef)[0]];
			
			for (const id in def) {
				if (!def.hasOwnProperty(id) || !validMethods.includes(id)) continue;
				
				const value = def[id];
				methods.push(raml10MethodConverter._import(value));
			}
			if (!_.isEmpty(methods)) model.methods = methods;
			
			if (def.hasOwnProperty('uriParameters')) {
				if (!_.isEmpty(def.uriParameters)) {
					const modelParameters = [];
					for (const id in def.uriParameters) {
						if (!def.uriParameters.hasOwnProperty(id)) continue;
						
						const value = def.uriParameters[id];
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
		}
		
		return model;
	}
}

module.exports = Raml10ResourceTypeConverter;