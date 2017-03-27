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
			'type', 'signatures','authorization', 'authorizationUrl', 'tokenUrl', 'scopes', 'names', '_in', 'requestTokenUri', 'schemaName', 'describedBy'
		];

		const ramlDef = Converter.copyObjectFrom(model, attrIdMap, attrIdSkip);
		let settings = {};

		switch (model.type) {
			case 'OAuth 1.0' : {
				ramlDef.type = model.type;
				if (model.hasOwnProperty('requestTokenUri')) settings.requestTokenUri = model.requestTokenUri;
				if (model.hasOwnProperty('authorizationUrl')) settings.authorizationUri = model.authorizationUrl;
				if (model.hasOwnProperty('tokenUrl')) settings.tokenCredentialsUri = model.tokenUrl;
				if (model.hasOwnProperty('signatures')) settings.signatures = model.signatures;
				break;
			}
			case 'OAuth 2.0' : case 'oauth2': {
				ramlDef.type = 'OAuth 2.0';
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
			case 'apiKey' : {
				ramlDef.type = 'Pass Through';
				if (model._in && model.name) {
					if (model._in === 'header'){
						let header = {};
						header[model.name] = {type: 'string'};
						ramlDef.describedBy.headers.push(header);
					}
					else if (model._in === 'query') {
						let queryParameter = {};
						queryParameter[model.name] = {type: 'string'};
						ramlDef.describedBy.queryParameters.push(queryParameter);
					}
				}
				break;
			}
			case 'basic' : {
				ramlDef.type = 'Basic Authentication';
				break;
			}
			case 'Pass Through' : case 'Basic Authentication' : {
				ramlDef.type = model.type;
				break;
			}
		}

		if (!_.isEmpty(settings)){
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

		if (ramlDef.hasOwnProperty('describedBy')) {
			const raml10MethodConverter = new Raml10MethodConverter();
			const describedBy = raml10MethodConverter._import(ramlDef.describedBy);
			model.describedBy = describedBy;
			if (describedBy.hasOwnProperty('headers')) {
				model._in = 'header';
				model.name = Object.keys(describedBy.headers)[0];
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