// @flow
const Converter = require('../converters/converter');
const ConverterModel = require('oas-raml-converter-model');
const _ = require('lodash');
const SecurityScope = ConverterModel.SecurityScope;
const Method = ConverterModel.Method;
const SecurityDefinition = ConverterModel.SecurityDefinition;
const RamlMethodConverter = require('../raml/ramlMethodConverter');
const Oas20RootConverter = require('../oas20/oas20RootConverter');
const oasHelper = require('../helpers/oas20');

class Oas20SecurityDefinitionConverter extends Converter {

	constructor(model: any, dereferencedAPI: any) {
		super(model);
		this.dereferencedAPI = dereferencedAPI;
	}

	export(models: SecurityDefinition[]) {
		const result = {};
		if (_.isEmpty(models)) return result;

		for (let i = 0; i < models.length; i++) {
			const model: SecurityDefinition = models[i];
			const swaggerDef = this._export(model);
			if (swaggerDef != null) {
				result[model.schemaName] = swaggerDef;
			}
		}

		return result;
	}

	import(oasDefs: any) {
		const result: SecurityDefinition[] = [];
		if (_.isEmpty(oasDefs)) return result;

		if (oasHelper.isFilePath(oasDefs) && this.dereferencedAPI) {
			oasDefs = this.dereferencedAPI;
		}

		for (const id in oasDefs) {
			if (!oasDefs.hasOwnProperty(id)) continue;
			const oasDef = oasDefs[id];
			oasDef.schemaName = id;
			const securityDefinition: SecurityDefinition = this._import(oasDef);
			result.push(securityDefinition);
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
		const oasDef = Oas20SecurityDefinitionConverter.createOasDef(model, attrIdMap, attrIdSkip);

		const type: string = model.type;
		if (oasValidSecurityTypes.indexOf(type) > -1) {
			oasDef.type = type;
		} else if (type.substr(0, 2) === 'x-') {
			oasDef.type = 'apiKey';
		} else {
			return;
		}

		switch (oasDef.type) {
			case 'oauth2' : {
				const authorizationUrlValidFlows = ['implicit', 'accessCode'];
				const tokenUrlValidFlows = ['application', 'password', 'accessCode'];
				if (model.hasOwnProperty('authorization') && model.authorization) oasDef.flow = model.authorization[0];
				if (_.includes(authorizationUrlValidFlows, oasDef.flow)) oasDef.authorizationUrl = model.authorizationUrl;
				if (_.includes(tokenUrlValidFlows, oasDef.flow)) oasDef.tokenUrl = model.tokenUrl;
				oasDef.scopes = {};
				if (model.hasOwnProperty('scopes') && model.scopes) {
					const scopes: SecurityScope[] = model.scopes;
					for (let i = 0; i < scopes.length; i++) {
						let scope: SecurityScope = scopes[i];
						oasDef.scopes[scope.value] = scope.description;
					}
				}
				break;
			}

			case 'apiKey' : {
				const describedBy: ?Method = model.describedBy;
				if (!describedBy) {
					oasDef.in = 'header';
					oasDef.name = model.schemaName;
				} else if (describedBy.hasOwnProperty('headers') && !_.isEmpty(describedBy.headers) && describedBy.headers != null) {
					oasDef.in = 'header';
					oasDef.name = describedBy.headers[0].name;
				} else if (describedBy.hasOwnProperty('parameters') && !_.isEmpty(describedBy.parameters) && describedBy.parameters != null) {
					oasDef.in = 'query';
					oasDef.name = describedBy.parameters[0].name;
				}
				break;
			}
		}

		return oasDef;
	}

	_import(oasDef: any) {
		const attrIdMap = {};
		const attrIdSkip = ['flow', 'scopes', 'in', 'name'];
		const model = Oas20SecurityDefinitionConverter.createSecurityDefinition(oasDef, attrIdMap, attrIdSkip, oasHelper.getAnnotationPrefix);

		if (oasDef.hasOwnProperty('flow')) {
			const authorization: string[] = [oasDef.flow];
			model.authorization = authorization;
		}
		if (oasDef.hasOwnProperty('scopes')) {
			const scopes: SecurityScope[] = [];
			for (const id in oasDef.scopes) {
				if (!oasDef.scopes.hasOwnProperty(id)) continue;
				let scope = new SecurityScope();
				scope.value = id;
				scope.description = oasDef.scopes[id];
				scopes.push(scope);
			}
			model.scopes = scopes;
		}

		if (oasDef.in && oasDef.name) {
			const describedBy = {};
			if (oasDef.in === 'header') {
				describedBy.headers = {};
				describedBy.headers[oasDef.name] = {type: ['string'], name: oasDef.name};
			}
			else if (oasDef.in === 'query') {
				describedBy.queryParameters = {};
				describedBy.queryParameters[oasDef.name] = {type: ['string'], name: oasDef.name};
			}
			const ramlMethodConverter = new RamlMethodConverter();
			const describedByModel: Method = ramlMethodConverter._import(describedBy);
			model.describedBy = describedByModel;
		}

		Oas20RootConverter.importAnnotations(oasDef, model, this.model);

		return model;
	}

	static createOasDef(securityDefinition, attrIdMap, attrIdSkip) {
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

	static createSecurityDefinition(model, attrIdMap, attrIdSkip, annotationPrefix) {
		const object = {};

		_.assign(object, model);
		attrIdSkip.map(id => {
			delete object[id];
		});
		_.keys(attrIdMap).map(id => {
			object[attrIdMap[id]] = object[id];
			delete object[id];
		});
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;

			if (id.startsWith(annotationPrefix) || id.startsWith('x-')) delete object[id];
		}

		const result = new SecurityDefinition();
		_.assign(result, object);

		return result;
	}
}

module.exports = Oas20SecurityDefinitionConverter;
