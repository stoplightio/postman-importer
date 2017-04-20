const Converter = require('../model/converter');
const Info = require('../model/info');
const _ = require('lodash');

class Oas20InfoConverter extends Converter{


	export(model) {
		return _.isEmpty(model)? {} : this._export(model);
	}

	import(swaggerDef) {
		return _.isEmpty(swaggerDef)? {} : this._import(swaggerDef);
	}

	_export(model) {
		const attrIdMap = {};
		const attrIdSkip = ['version', 'contactName', 'contactUrl', 'contactEmail', 'licenseName', 'licenseUrl'];
		const swaggerDef = Oas20InfoConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);

		swaggerDef.version = model.hasOwnProperty('version') ? model.version.toString() : '';
		
		const contact = {};
		if (model.hasOwnProperty('contactName')) contact.name = model.contactName;
		if (model.hasOwnProperty('contactUrl')) contact.url = model.contactUrl;
		if (model.hasOwnProperty('contactEmail')) contact.email = model.contactEmail;

		const license = {};
		if(model.hasOwnProperty('licenseName')) license.name = model.licenseName;
		if(model.hasOwnProperty('licenseUrl')) license.url = model.licenseUrl;


		if (!_.isEmpty(contact)) swaggerDef.contact = contact;
		if (!_.isEmpty(license)) swaggerDef.license = license;

		return swaggerDef;
	}

	_import(swaggerDef) {
		const attrIdMap = {};
		const attrIdSkip = ['contact', 'license'];
		const model = Oas20InfoConverter.copyObjectFrom(swaggerDef, attrIdMap, attrIdSkip);

		if (swaggerDef.hasOwnProperty('contact')) {
			const attrContactIdMap = {
				'name' : 'contactName',
				'url' : 'contactUrl',
				'email' : 'contactEmail'
			};
			_.merge(model, Converter.copyObjectFrom(swaggerDef.contact, attrContactIdMap,[]));
		}

		if (swaggerDef.hasOwnProperty('license')) {
			const attrLicenseIdMap = {
				'name' : 'licenseName',
				'url' : 'licenseUrl'
			};
			_.merge(model, Converter.copyObjectFrom(swaggerDef.license, attrLicenseIdMap,[]));
		}

		return model;
	}

	static copyObjectFrom(object, attrIdMap, attrIdSkip) {
		const result = new Info();

		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;

			if (attrIdSkip.indexOf(id) < 0) {
				result[attrIdMap.hasOwnProperty(id) ? attrIdMap[id] : id] = object[id];
			}
		}

		return result;
	}
}

module.exports = Oas20InfoConverter;