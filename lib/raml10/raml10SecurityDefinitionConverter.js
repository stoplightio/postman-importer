const _ = require('lodash');
const Converter = require('../model/converter');
const SecurityScope = require('../model/securityScope');
const raml10ResourceConverter = require('../raml10/raml10ResourceConverter');

class Raml10SecurityDefinitionConverter extends Converter{

	export(models) {
		const result = {};
		if (_.isEmpty(models)) return result;

		models.map(securityDefinition => {
			result[securityDefinition.name] = this._export(securityDefinition);
		});

		return result;
	}

	_export(model) {
		const attrIdMap = {};

		const attrIdSkip = [
			'signatures','authorization', 'authorizationUrl', 'tokenUrl', 'scopes', 'names', '_in', 'requestTokenUri', 'name'
		];

		const ramlDef = Converter.copyObjectFrom(model, attrIdMap, attrIdSkip);

		let settings = {};
		switch (ramlDef.type) {
			case 'OAuth 1.0' : {
				if (model.hasOwnProperty('requestTokenUri')) settings.requestTokenUri = model.requestTokenUri;
				if (model.hasOwnProperty('authorizationUrl')) settings.authorizationUri = model.authorizationUrl;
				if (model.hasOwnProperty('tokenUrl')) settings.tokenCredentialsUri = model.tokenUrl;
				if (model.hasOwnProperty('signatures')) settings.signatures = model.signatures;
				break;
			}
			case ('OAuth 2.0' || 'oauth2') : {
				if (model.hasOwnProperty('authorizationUrl')) settings.authorizationUri = model.authorizationUrl;
				if (model.hasOwnProperty('tokenUrl')) settings.accessTokenUri = model.tokenUrl;
				if (model.hasOwnProperty('authorization')) settings.authorizationGrants = model.authorization;
				if (model.hasOwnProperty('scopes')) {
					settings.scopes = [];
					for (const id in model.scopes) {
						if (!model.scopes.hasOwnProperty(id)) continue;
						settings.scopes.push(model.scopes[id].value);
					}
				}
				break;
			}
		}

		if (!_.isEmpty(settings)){
			ramlDef.settings = settings;
		}

		return ramlDef;
	}

	import(ramlDef) {
		const result = [];
		if (_.isEmpty(ramlDef)) return result;

		for (const id in ramlDef) {
			if (!ramlDef.hasOwnProperty(id)) continue;

			result.push(this._import(ramlDef[id][Object.keys(ramlDef[id])[0]]));
		}

		return result;
	}

	_import(ramlDef) {

		const attrIdMap = {};

		const attrIdSkip = ['settings', 'describedBy'];

		const model = Converter.copyObjectFrom(ramlDef, attrIdMap, attrIdSkip);

		if (ramlDef.hasOwnProperty('settings')) {
			let settings = ramlDef.settings;
			if (settings.hasOwnProperty('accessTokenUri')) model.tokenUrl = settings.accessTokenUri;
			if (settings.hasOwnProperty('tokenCredentialsUri')) model.tokenUrl = settings.tokenCredentialsUri;
			if (settings.hasOwnProperty('authorizationUri')) model.authorizationUrl = settings.authorizationUri;
			if (settings.hasOwnProperty('authorizationGrants')) model.authorization = settings.authorizationGrants;
			if (settings.hasOwnProperty('requestTokenUri')) model.requestTokenUri = settings.requestTokenUri;
			if (settings.hasOwnProperty('signatures')) model.signatures = settings.signatures;

			if (settings.hasOwnProperty('scopes')) {
				model.scopes = [];
				for (const id in settings.scopes) {
					if (!settings.scopes.hasOwnProperty(id)) continue;
					const scope = new SecurityScope();
					scope.value = settings.scopes[id];
					model.scopes.push(scope);
				}
			}
		}

		// if (ramlDef.hasOwnProperty('describedBy')) model.describedBy = Raml10MethodConverter.import(ramlDef.describedBy);

		return model;
	}
}

module.exports = Raml10SecurityDefinitionConverter;