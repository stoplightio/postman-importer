const _ = require('lodash');
const Trait = require('../model/trait');
const Method = require('../model/method');
const Parameter = require('../model/parameter');
const Converter = require('../model/converter');
const Oas20DefinitionConverter = require('../oas20/Oas20DefinitionConverter');
const Oas20MethodConverter = require('../oas20/Oas20MethodConverter');
const helper = require('../helpers/converter');

// todo: exporto los de body on no?
// todo: agrego algun parameter in body para exportar?
class Oas20TraitConverter extends Converter {
	
	export(models) {
		const result = {};
		if (_.isEmpty(models)) return result;
		
		const traits = {};
		models.map(model => {
			traits[model.name] = this._export(model.method);
		});
		
		for (const id in traits) {
			if (!traits.hasOwnProperty(id)) continue;
			
			const trait = traits[id];
			for (const index in trait) {
				if (!trait.hasOwnProperty(index)) continue;
				
				const param = trait[index];
				const name = 'trait:' + id + ':' + index;
				result[name] = param;
			}
		}
		
		return result;
	}
	
	// exports 1 trait definition
	_export(model) {
		const result = {};
		const oas20MethodConverter = new Oas20MethodConverter();
		
		const methodResult = oas20MethodConverter._export(model);
		if (methodResult.hasOwnProperty('parameters')) {
			for (const id in methodResult.parameters) {
				if (!methodResult.parameters.hasOwnProperty(id)) continue;
				
				const paramResult = methodResult.parameters[id];
				result[paramResult.name] = paramResult;
			}
		}
		
		return result;
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
	
	import(oasDefs) {
		const result = [];
		if (_.isEmpty(oasDefs)) return result;
		
		
		const traits = {};
		const traitNames = [];
		for (const id in oasDefs) {
			if (!oasDefs.hasOwnProperty(id)) continue;
			
			const oasDef = oasDefs[id];
			const traitName = Oas20TraitConverter.getTraitName(id);
			if (!traitNames.includes(traitName)) {
				traits[traitName] = [oasDef];
				traitNames.push(traitName);
			} else {
				const parameters = traits[traitName];
				parameters.push(oasDef);
			}
		}
		
		for (const id in traits) {
			if (!traits.hasOwnProperty(id)) continue;
			
			const model = new Trait();
			model.name = id;
			model.method = this._import(traits[id]);
			result.push(model);
		}
		
		return result;
	}
	
	// imports 1 trait definition
	_import(oasDef) {
		const oas20MethodConverter = new Oas20MethodConverter();
		
		return oas20MethodConverter._import({ parameters: oasDef});
	}
	
	static getTraitName(fullName) {
		return fullName.substring(fullName.indexOf(':') + 1, fullName.lastIndexOf(':'))
	}
	
}

module.exports = Oas20TraitConverter;