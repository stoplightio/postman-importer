const _ = require('lodash');
const Trait = require('../model/trait');
const Converter = require('../model/converter');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');
const Raml10MethodConverter = require('../raml10/Raml10MethodConverter');
const helper = require('../helpers/converter');
 
class Raml10TraitConverter extends Converter {
	
	export(models) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		models.map(model => {
			result[model.name] = this._export(model);
		});
		
		return result;
	}
	
	// exports 1 trait definition
	_export(model) {
		const attrIdMap = {};
		
		const attrIdSkip = ['name', 'method'];
		const ramlDef = Raml10TraitConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);
		const raml10MethodConverter = new Raml10MethodConverter();
		
		if (model.hasOwnProperty('method') && !_.isEmpty(model.method)) {
		  const method = raml10MethodConverter._export(model.method);
		  for (const id in method) {
		  	if (!method.hasOwnProperty(id)) continue;
		  	
		  	ramlDef[id] = method[id];
			}
		}
		
		return ramlDef;
	}
	
	static copyObjectFrom(object, attrIdMap, attrIdSkip) {
		const result = new Trait();
		
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
		
		helper.removePropertyFromObject(ramlDefs, 'typePropertyKind');
		helper.removePropertyFromObject(ramlDefs, 'structuredExample');
		for (const id in ramlDefs) {
			if (!ramlDefs.hasOwnProperty(id)) continue;
			
			const ramlDef = ramlDefs[id];
			result.push(this._import(ramlDef));
		}
		return result;
	}
	
	// imports 1 trait definition
	_import(ramlDef) {
		const model = new Trait();
		const raml10MethodConverter = new Raml10MethodConverter();
		
		if (!_.isEmpty(ramlDef)) {
			const def = ramlDef[Object.keys(ramlDef)[0]];
			if (def.hasOwnProperty('name')) model.name = def.name;
			if (def.hasOwnProperty('usage')) model.usage = def.usage;
			const method = raml10MethodConverter._import(def);
			if (!_.isEmpty(method)) model.method = method;
		}
		
		return model;
	}
}

module.exports = Raml10TraitConverter;