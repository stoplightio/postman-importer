const _ = require('lodash');
const Resource = require('../model/resource');
const Parameter = require('../model/parameter');
const Converter = require('../model/converter');
const Oas20DefinitionConverter = require('../oas20/Oas20DefinitionConverter');
const Oas20MethodConverter = require('../oas20/Oas20MethodConverter');

class Oas20ResourceConverter extends Converter {
	
	export(models) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		models.map(model => {
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
					parameter.in = 'path';
					parameter.name = value.name; // todo: se podría definir un nuevo definition converter para parameters que exporte con name y required
					parameter.required = true; // todo: cómo se cuándo es false?
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
			ramlDef.relativePath = id;
			result.push(ramlDef);
		}
		
		return result;
	}
	
	_import(oasDef) {
		const attrIdMap = {};
		
		const validMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];
		const attrIdSkip = [];
		const model = Oas20ResourceConverter.copyObjectFrom(oasDef, attrIdMap, attrIdSkip.concat(validMethods));
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
					parameter.name = value.name;
					parameter.definition = oas20DefinitionConverter._import(value);
					parameters.push(parameter);
				}
				model.parameters = parameters;
			}
		}
		
		return model;
	}
	
}

module.exports = Oas20ResourceConverter;