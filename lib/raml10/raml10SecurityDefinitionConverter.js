const _ = require('lodash');
const Converter = require('../model/converter');
const SecurityScope = require('../model/securityScope');
const Raml10MethodConverter = require('../raml10/raml10MethodConverter');

class Raml10SecurityDefinitionConverter extends Converter{

	export(models) {
		const result = {};
		if (_.isEmpty(models)) return result;

		models.map(model => {
			result[model.schemaName] = this._export(model);
		});

		return result;
	}

	_export(model) {
		const attrIdMap = {};
		const attrIdSkip = [
			'type', 'signatures','authorization', 'authorizationUrl', 'tokenUrl', 'scopes', 'name',
			'_in', 'requestTokenUri', 'schemaName', 'describedBy'
		];
		const ramlDef = Converter.copyObjectFrom(model, attrIdMap, attrIdSkip);

		let settings = {};
		if (model.hasOwnProperty('type')) {
			switch (model.type) {
				case 'oauth1' :
					ramlDef.type = 'OAuth 1.0';
					if (model.hasOwnProperty('requestTokenUri')) settings.requestTokenUri = model.requestTokenUri;
					if (model.hasOwnProperty('authorizationUrl')) settings.authorizationUri = model.authorizationUrl;
					if (model.hasOwnProperty('tokenUrl')) settings.tokenCredentialsUri = model.tokenUrl;
					if (model.hasOwnProperty('signatures')) settings.signatures = model.signatures;
					break;

				case 'oauth2' :
					ramlDef.type = 'OAuth 2.0';
					if (model.hasOwnProperty('authorizationUrl')) settings.authorizationUri = model.authorizationUrl;
					if (model.hasOwnProperty('tokenUrl')) settings.accessTokenUri = model.tokenUrl;

					if (model.hasOwnProperty('authorization')) {
						let grants = model.authorization;
						for (const id in grants) {
							if(!grants.hasOwnProperty(id)) continue;

							switch (grants[id]) {
								case 'accessCode':
									grants[id] = 'authorization_code';
									break;
								case 'application' :
									grants[id] = 'client_credentials';
									break;
							}
						}
						settings.authorizationGrants = grants;
					}

					if (model.hasOwnProperty('scopes')) {
						settings.scopes = [];
						for (const id in model.scopes) {
							if (!model.scopes.hasOwnProperty(id)) continue;
							settings.scopes.push(model.scopes[id].value);
						}
						if (_.isEmpty(settings.scopes)) {
							delete settings.scopes;
						}
					}
					break;

				case 'basic' :
					ramlDef.type = 'Basic Authentication';
					break;

				case 'apiKey' :
					ramlDef.type = 'Pass Through';
					break;

				case 'digest' :
					ramlDef.type = 'Digest Authentication';
					break;

				default :
					ramlDef.type = model.type;
					break;
			}
		}

		if (!_.isEmpty(settings)) {
			ramlDef.settings = settings;
		}

		if (model.describedBy) {
			const raml10MethodConverter = new Raml10MethodConverter();
			ramlDef.describedBy = raml10MethodConverter._export(model.describedBy);
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
		const attrIdMap = {
			'name' : 'schemaName'
		};
		const attrIdSkip = ['type', 'settings', 'describedBy', 'authorizationGrants'];
		let model = Converter.copyObjectFrom(ramlDef, attrIdMap, attrIdSkip);

		if (ramlDef.hasOwnProperty('type')) {
			switch (ramlDef.type) {
				case 'OAuth 1.0' :
					model.type = 'oauth1';
					break;
				case 'OAuth 2.0' :
					model.type = 'oauth2';
					break;
				case 'Pass Through' :
					model.type = 'apiKey';
					break;
				case 'Basic Authentication' :
					model.type = 'basic';
					break;
				case 'Digest Authentication' :
					model.type = 'digest';
					break;
				default :
					if (ramlDef.type.substr(0,2) === 'x-') {
						model.type = ramlDef.type;
					} else {
						model.type = 'x-' + ramlDef.type;
					}
					break;
			}
		}

		if (ramlDef.hasOwnProperty('settings')) {
			let settings = ramlDef.settings;
			const attrSettingsIdMap = {
				'accessTokenUri': 'tokenUrl',
				'tokenCredentialsUri': 'tokenUrl',
				'authorizationUri': 'authorizationUrl',
				'authorizationGrants': 'authorization',
			};
			const attrSettingsIdSkip = ['scopes', 'authorizationGrants'];
			_.merge(model,Converter.copyObjectFrom(settings, attrSettingsIdMap, attrSettingsIdSkip));

			if (settings.hasOwnProperty('scopes')) {
				model.scopes = [];
				for (const id in settings.scopes) {
					if (!settings.scopes.hasOwnProperty(id)) continue;
					const scope = new SecurityScope();
					scope.value = settings.scopes[id];
					scope.description = "";
					model.scopes.push(scope);
				}
			}

			if (settings.hasOwnProperty('authorizationGrants')) {
				let grants = settings.authorizationGrants;
				for (const id in grants) {
					if (!grants.hasOwnProperty(id)) continue;

					switch (grants[id]) {
						case 'client_credentials' :
							grants[id] = 'application';
							break;
						case 'authorization_code' :
							grants[id] = 'accessCode';
							break;
					}
				}
				model.authorization = grants;
			}
		}

		if (ramlDef.hasOwnProperty('describedBy')) {
			const raml10MethodConverter = new Raml10MethodConverter();
			const describedBy = raml10MethodConverter._import(ramlDef.describedBy);
			model.describedBy = describedBy;
			if (describedBy.hasOwnProperty('headers')) {
				model._in = 'header';
				model.name = describedBy.headers[0].definition.name;
			}
			else if (describedBy.hasOwnProperty('queryParameters')) {
				model._in = 'query';
				model.name = Object.keys(describedBy.queryParameters)[0]
			}
		}

		return model;
	}
}

module.exports = Raml10SecurityDefinitionConverter;