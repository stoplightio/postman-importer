const Converter = require('../model/converter');
const _ = require('lodash');
const SecurityScope = require('../model/securityScope');



class Oas20SecurityDefinitionConverter extends Converter {

	export(models) {
		const result = {};
		if (_.isEmpty(models)) return result;

		models.map(model => {
			const swaggerDef = this._export(model);
			if (swaggerDef != null){
				result[model.schemaName] = swaggerDef;
			}
		});

		return result;
	}

	import(oasDefs) {
		const result = [];
		if (_.isEmpty(oasDefs)) return result;

		for (const id in oasDefs) {
			if (!oasDefs.hasOwnProperty(id)) continue;
			const oasDef = oasDefs[id];
			oasDef.schemaName = id;
			result.push(this._import(oasDef));
		}

		return result;
	}

	_export(model) {
		const attrIdMap = {
			'_in': 'in'
		};

		const attrIdSkip = [
			'type','schemaName', 'authorization', 'scopes', 'signatures', 'displayName', 'describedBy', 'requestTokenUri'
		];

		const swaggerDef = Converter.copyObjectFrom(model, attrIdMap, attrIdSkip);

		switch(model.type) {
			case 'OAuth 2.0': case 'oauth2' : {
				swaggerDef.type = 'oauth2';
				if (model.hasOwnProperty('authorization')) swaggerDef.flow = model.authorization[0];
				if (model.hasOwnProperty('scopes')) {
					swaggerDef.scopes = {};
					for (const id in model.scopes) {
						if (!model.scopes.hasOwnProperty(id)) continue;
						let scope = model.scopes[id];
						swaggerDef.scopes[scope.value] = scope.description;
					}
				}
				break;
			}
			case 'apiKey': case 'Pass Through' : {
				swaggerDef.type = 'apiKey';
				break;
			}
			case 'Basic Authentication' : case 'basic' : {
				swaggerDef.type = 'basic';
				break;
			}
			case 'OAuth 1.0' : case 'Digest Authentication' : {
				return;
			}
		}

		return swaggerDef;
	}

	_import(securityDef) {
		const attrIdMap = {
			"in" : "_in"
		};

		const attrIdSkip = ['flow', 'scopes'];

		const model = Converter.copyObjectFrom(securityDef, attrIdMap, attrIdSkip);

		if (securityDef.hasOwnProperty('flow')) model.authorization = [securityDef.flow];
		if (securityDef.hasOwnProperty('scopes')) {
			model.scopes = [];
			for (const id in securityDef.scopes) {
				if (!securityDef.scopes.hasOwnProperty(id)) continue;
				let scope = new SecurityScope();
				scope.value = id;
				scope.description = securityDef.scopes[id];
				model.scopes.push(scope);
			}
		}
		return model;
	}
}

module.exports = Oas20SecurityDefinitionConverter;