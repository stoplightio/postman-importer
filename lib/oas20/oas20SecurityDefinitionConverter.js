const Converter = require('../model/converter');
const _ = require('lodash');
const SecurityScope = require('../model/securityScope');
const SecurityDefinition = require('../model/securityDefinition');
const Raml10MethodConverter = require('../raml10/raml10MethodConverter');
const oasHelper = require('../helpers/oas20');

class Oas20SecurityDefinitionConverter extends Converter {

	constructor(model, dereferencedAPI) {
		super(model);
		this.dereferencedAPI = dereferencedAPI;
	}

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

		if (oasHelper.isFilePath(oasDefs) && this.dereferencedAPI) {
			oasDefs = this.dereferencedAPI;
		}

		for (const id in oasDefs) {
			if (!oasDefs.hasOwnProperty(id)) continue;
			const oasDef = oasDefs[id];
			oasDef.schemaName = id;
			result.push(this._import(oasDef));
		}
		return result;
	}

	_export(model) {
		const attrIdMap = {};
		const attrIdSkip = [
			'type','schemaName', 'authorization', 'scopes', 'signatures', 'displayName',
			'describedBy', 'requestTokenUri', 'tokenUrl', 'authorizationUrl', 'name', '_in'
		];
		const oasValidSecurityTypes = ['oauth2', 'basic', 'apiKey'];
		const oasDef = Oas20SecurityDefinitionConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);

		if (oasValidSecurityTypes.indexOf(model.type) > -1){
			oasDef.type = model.type;
		} else if (model.type.substr(0,2) === 'x-') {
			oasDef.type = 'apiKey';
		} else {
			return;
		}

		switch (oasDef.type){
			case 'oauth2' :
				const authorizationUrlValidFlows = ['implicit', 'accessCode'];
				const tokenUrlValidFlows = ['application', 'password', 'accessCode'];
				if (model.hasOwnProperty('authorization')) oasDef.flow = model.authorization[0];
				if (_.includes(authorizationUrlValidFlows, oasDef.flow)) oasDef.authorizationUrl = model.authorizationUrl;
				if (_.includes(tokenUrlValidFlows, oasDef.flow)) oasDef.tokenUrl = model.tokenUrl;
				oasDef.scopes = {};
				if (model.hasOwnProperty('scopes')) {
					for (const id in model.scopes) {
						if (!model.scopes.hasOwnProperty(id)) continue;
						let scope = model.scopes[id];
						oasDef.scopes[scope.value] = scope.description;
					}
				}
				break;

			case 'apiKey' :
				const describedBy = model.describedBy;
				if (describedBy.hasOwnProperty('headers') && !_.isEmpty(describedBy.headers)) {
					oasDef.in = 'header';
					oasDef.name = describedBy.headers[0].name;
				} else if (describedBy.hasOwnProperty('parameters') && !_.isEmpty(describedBy.parameters)){
					oasDef.in = 'query';
					oasDef.name = describedBy.parameters[0].name;
				}
				break;
		}

		return oasDef;
	}

	_import(securityDef) {
		const attrIdMap = {};
		const attrIdSkip = ['flow', 'scopes', 'in', 'name'];
		const model = Oas20SecurityDefinitionConverter.copyObjectFrom(securityDef, attrIdMap, attrIdSkip);

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

		if (securityDef.in && securityDef.name) {
			const describedBy = {};
			if (securityDef.in === 'header'){
				describedBy.headers = {};
				describedBy.headers[securityDef.name] = {type: ['string'], name: securityDef.name};
			}
			else if (securityDef.in === 'query') {
				describedBy.queryParameters = {};
				describedBy.queryParameters[securityDef.name] = {type: ['string'], name: securityDef.name};
			}
			const raml10MethodConverter = new Raml10MethodConverter();
			model.describedBy = raml10MethodConverter._import(describedBy);
		}

		return model;
	}

	static copyObjectFrom(object, attrIdMap, attrIdSkip) {
		const result = new SecurityDefinition();

		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;

			if (attrIdSkip.indexOf(id) < 0) {
				result[attrIdMap.hasOwnProperty(id) ? attrIdMap[id] : id] = object[id];
			}
		}

		return result;
	}
}

module.exports = Oas20SecurityDefinitionConverter;