// @flow
const _ = require('lodash');

const ConverterModel = require('oas-raml-converter-model');
const Converter = require('../converters/converter');
const SecurityDefinition = ConverterModel.SecurityDefinition;
const SecurityScope = ConverterModel.SecurityScope;
const Method = ConverterModel.Method;

const { OAuthFlows, OAuthFlow } = require('./oas30Types');

import type { SecurityScheme, Reference } from './oas30Types';

class Oas30SecurityDefinitionConverter extends Converter {
	export(models: SecurityDefinition[]): { [string]: SecurityScheme | Reference } {
		const result = {};
		if (_.isEmpty(models)) return result;

		for (let i = 0; i < models.length; i++) {
			const model: SecurityDefinition = models[i];
			const oasDef = this._export(model);
			if (oasDef != null) {
				result[model.schemaName] = oasDef;
			}
		}

		return result;
	}

	_export(model: SecurityDefinition) {
		const attrIdMap = {};
		const attrIdSkip = [
			'type', 'schemaName', 'authorization', 'scopes', 'signatures', 'displayName',
			'describedBy', 'requestTokenUri', 'tokenUrl', 'authorizationUrl', 'name', '_in'
		];
		const oasValidSecurityTypes = ['oauth2', 'basic', 'apiKey'];
		const oasDef: SecurityScheme = Oas30SecurityDefinitionConverter.createOasDef(model, attrIdMap, attrIdSkip);

		const type: string = model.type;
		if (oasValidSecurityTypes.indexOf(type) !== -1) {
			oasDef.type = type;
		} else if (type.substr(0, 2) === 'x-') {
			oasDef.type = 'apiKey';
		} else {
			return;
		}

		switch (oasDef.type) {
			case 'basic' : {
				oasDef.scheme = 'basic';
				oasDef.type = 'http';
				break;
			}

			case 'oauth2' : {
				oasDef.flows = new OAuthFlows();

				if (model == null || model.authorization == null || model.authorization[0] == null) break;

				const validFlows = {
					'implicit': 'implicit',
					'password': 'password',
					'application': 'clientCredentials',
					'accessCode': 'authorizationCode'
				};
				const authorizationUrlValidFlows = ['implicit', 'authorizationCode'];
				const tokenUrlValidFlows = ['clientCredentials', 'password', 'authorizationCode'];

				// $ExpectError flow is stupid ..
				const flowType: 'implicit' | 'password' | 'clientCredentials' | 'authorizationCode' = validFlows[model.authorization[0]];
				const flow = new OAuthFlow();

				if (_.includes(authorizationUrlValidFlows, flowType)) {
					flow.authorizationUrl = model.authorizationUrl;
				}
				if (_.includes(tokenUrlValidFlows, flowType)) {
					flow.tokenUrl = model.tokenUrl;
				}

				flow.scopes = {};
				if (model.scopes != null) {
					const scopes: SecurityScope[] = model.scopes;
					for (let i = 0; i < scopes.length; i++) {
						let scope: SecurityScope = scopes[i];
						flow.scopes[scope.value] = scope.description;
					}
				}

				// $ExpectError flow is stupid ..
				oasDef.flows[flowType] = flow;

				break;
			}

			case 'apiKey' : {
				const describedBy: ?Method = model.describedBy;
				if (describedBy == null) {
					oasDef.in = 'header';
					oasDef.name = model.schemaName;
				} else if (describedBy.headers != null && !_.isEmpty(describedBy.headers) && describedBy.headers != null) {
					oasDef.in = 'header';
					oasDef.name = describedBy.headers[0].name;
				} else if (describedBy.parameters != null && !_.isEmpty(describedBy.parameters) && describedBy.parameters != null) {
					oasDef.in = 'query';
					oasDef.name = describedBy.parameters[0].name;
				}
				break;
			}
		}

		return oasDef;
	}

	static createOasDef(securityDefinition, attrIdMap, attrIdSkip) {
		const result: any = {};

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
}

module.exports = Oas30SecurityDefinitionConverter;
