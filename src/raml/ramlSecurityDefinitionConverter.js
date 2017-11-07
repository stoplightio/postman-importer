// @flow
const _ = require('lodash');
const ConverterModel = require('oas-raml-converter-model');
const Converter = require('../converters/converter');
const SecurityScope = ConverterModel.SecurityScope;
const Method = ConverterModel.Method;
const SecurityDefinition = ConverterModel.SecurityDefinition;
const RamlMethodConverter = require('../raml/ramlMethodConverter');
const RamlAnnotationConverter = require('../raml/ramlAnnotationConverter');

class RamlSecurityDefinitionConverter extends Converter {

	export(models:SecurityDefinition[]) {
		const result = {};
		if (_.isEmpty(models)) return result;

		for (let i = 0; i < models.length; i++) {
			const model: SecurityDefinition = models[i];
			result[model.schemaName] = this._export(model);
		}

		return result;
	}

	_export(model:SecurityDefinition) {
		const attrIdMap = {};
		const attrIdSkip = [
			'type', 'signatures','authorization', 'authorizationUrl', 'tokenUrl', 'scopes', 'name',
			'_in', 'requestTokenUri', 'schemaName', 'describedBy', 'annotations'
		];
		const ramlDef = RamlSecurityDefinitionConverter.createRamlDef(model, attrIdMap, attrIdSkip);

		let settings = {};
		if (model.hasOwnProperty('type')) {
			const type: string = model.type;
			switch (type) {
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

					if (model.hasOwnProperty('authorization') && model.authorization) {
						let grants: string[] = model.authorization;
						for (let i = 0; i < grants.length; i++) {
							switch (grants[i]) {
								case 'accessCode':
									grants[i] = 'authorization_code';
									break;
								case 'application' :
									grants[i] = 'client_credentials';
									break;
							}
						}
						if (_.includes(grants, 'implicit') && !settings.hasOwnProperty('accessTokenUri')) {
							settings.accessTokenUri = '';
						}

						settings.authorizationGrants = grants;
					}

					if (model.hasOwnProperty('scopes')) {
						settings.scopes = [];
						const scopes: ?SecurityScope[] = model.scopes;
						if (scopes) {
							for (let i = 0; i < scopes.length; i++) {
								const scope: SecurityScope = scopes[i];
								settings.scopes.push(scope.value);
							}
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
					ramlDef.type = type;
					break;
			}
		}

		if (!_.isEmpty(settings)) {
			ramlDef.settings = settings;
		}

		if (model.describedBy) {
			const methodConverter = new RamlMethodConverter(this.model);
			const describedBy: Method = model.describedBy;
			const method = methodConverter._export(describedBy);
			delete method.displayName;
			ramlDef.describedBy = method;
		}

		RamlAnnotationConverter.exportAnnotations(this.model, this.annotationPrefix, this.def, model, ramlDef);
		
		return ramlDef;
	}

	import(ramlDefs:any) {
		const result: SecurityDefinition[] = [];
		if (_.isEmpty(ramlDefs)) return result;

		for (const id in ramlDefs) {
			if (!ramlDefs.hasOwnProperty(id)) continue;
			const securityDefName = Object.keys(ramlDefs[id])[0];
			const securityDef = ramlDefs[id][securityDefName];
			securityDef.name = securityDefName;
			const securityDefinition: SecurityDefinition = this._import(securityDef);
			result.push(securityDefinition);
		}

		return result;
	}

	_import(ramlDef:any) {
		const attrIdMap = {
			'name' : 'schemaName'
		};
		const attrIdSkip = ['type', 'settings', 'describedBy', 'authorizationGrants', 'sourceMap'];
		const model = RamlSecurityDefinitionConverter.createSecurityDefinition(ramlDef, attrIdMap, attrIdSkip);

		if (ramlDef.hasOwnProperty('type')) {
			const type: string = ramlDef.type;
			switch (type) {
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
				case 'DigestSecurityScheme Authentication' :
					model.type = 'digest';
					break;
				default :
					if (type.substr(0,2) === 'x-') {
						model.type = type;
					} else {
						model.type = 'x-' + type;
					}
					break;
			}
		}

		if (ramlDef.hasOwnProperty('settings')) {
			const settings = ramlDef.settings;
			const attrSettingsIdMap = {
				'accessTokenUri': 'tokenUrl',
				'tokenCredentialsUri': 'tokenUrl',
				'authorizationUri': 'authorizationUrl',
				'authorizationGrants': 'authorization',
			};
			const attrSettingsIdSkip = ['scopes', 'authorizationGrants', 'sourceMap'];
			const settingsModel = RamlSecurityDefinitionConverter.createSecurityDefinition(settings, attrSettingsIdMap, attrSettingsIdSkip);
			_.merge(model, settingsModel);

			if (settings.hasOwnProperty('scopes')) {
				const scopes: SecurityScope[] = [];
				for (const id in settings.scopes) {
					if (!settings.scopes.hasOwnProperty(id)) continue;
					const scope = new SecurityScope();
					scope.value = settings.scopes[id];
					scope.description = '';
					scopes.push(scope);
				}
				model.scopes = scopes;
			}

			if (settings.hasOwnProperty('authorizationGrants')) {
				const grants: string[] = settings.authorizationGrants;
				for (let i = 0; i < grants.length; i++) {
					switch (grants[i]) {
						case 'credentials' :
						case 'client_credentials' :
							grants[i] = 'application';
							break;
						case 'code' :
						case 'authorization_code' :
							grants[i] = 'accessCode';
							break;
						case 'token' :
							grants[i] = 'implicit';
							break;
						case 'owner' :
							grants[i] = 'password';
							break;
					}
				}
				model.authorization = grants;
			}
		}

		if (ramlDef.hasOwnProperty('describedBy')) {
			const methodConverter = new RamlMethodConverter();
			const describedBy: Method = methodConverter._import(ramlDef.describedBy);
			model.describedBy = describedBy;
			model._in = 'header';
			if (describedBy.hasOwnProperty('headers') && describedBy.headers != null) {
				const header = describedBy.headers[0];
				if (header.hasOwnProperty('definition') && header.definition) {
					const name: string = header.definition.name;
					model.name = name;
				}
			}
			else if (describedBy.hasOwnProperty('parameters') && describedBy.parameters != null) {
				const parameter = describedBy.parameters[0];
				if (parameter.hasOwnProperty('definition') && parameter.definition) {
					const name: string = parameter.name;
					model.name = name;
				}
			}
		}

		return model;
	}

	static createRamlDef(securityDefinition, attrIdMap, attrIdSkip) {
		const result = {};
		
		_.assign(result, securityDefinition);
		attrIdSkip.map(id => {
			delete result[id];
		});
		_.keys(attrIdMap).map(id => {
			result[attrIdMap[id]] = result[id];
			delete result[id];
		});
		
		return result;
	}
	
	static createSecurityDefinition(ramlDef, attrIdMap, attrIdSkip) {
		const object = {};
		
		_.entries(ramlDef).map(([key, value]) => {
			if (attrIdSkip.indexOf(key) < 0 && !key.startsWith('x-')) {
				object[attrIdMap.hasOwnProperty(key) ? attrIdMap[key] : key] = value;
			}
		});
		const result = new SecurityDefinition();
		_.assign(result, object);

		return result;
	}
}

module.exports = RamlSecurityDefinitionConverter;
