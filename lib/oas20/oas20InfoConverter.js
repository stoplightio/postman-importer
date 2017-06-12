const Converter = require('../model/converter');
const Oas20AnnotationConverter = require('../oas20/Oas20AnnotationConverter');
const Info = require('../model/info');
const _ = require('lodash');
const oasHelper = require('../helpers/oas20');

class Oas20InfoConverter extends Converter {
	
	export(model) {
		return _.isEmpty(model)? {} : this._export(model);
	}

	import(oasDef) {
		return _.isEmpty(oasDef)? {} : this._import(oasDef);
	}

	_export(model) {
		const attrIdMap = {};
		
		const attrIdSkip = ['version', 'contactName', 'contactUrl', 'contactEmail', 'licenseName', 'licenseUrl'];
		const annotationPrefix = oasHelper.getAnnotationPrefix;
		const oasDef = Oas20InfoConverter.copyObjectFrom(model, attrIdMap, attrIdSkip, annotationPrefix);

		oasDef.version = model.hasOwnProperty('version') ? model.version.toString() : '';
		
		const contact = {};
		if (model.hasOwnProperty('contactName')) contact.name = model.contactName;
		if (model.hasOwnProperty('contactUrl')) contact.url = model.contactUrl;
		if (model.hasOwnProperty('contactEmail')) contact.email = model.contactEmail;

		const license = {};
		if(model.hasOwnProperty('licenseName')) license.name = model.licenseName;
		if(model.hasOwnProperty('licenseUrl')) license.url = model.licenseUrl;


		if (!_.isEmpty(contact)) oasDef.contact = contact;
		if (!_.isEmpty(license)) oasDef.license = license;

		return oasDef;
	}

	_import(oasDef) {
		const attrIdMap = {};
		const attrIdSkip = ['contact', 'license'];
		const model = Oas20InfoConverter.copyObjectFrom(oasDef, attrIdMap, attrIdSkip);
		const annotationConverter = new Oas20AnnotationConverter(this.model);
		
		if (oasDef.hasOwnProperty('contact')) {
			const contact = {};
			_.assign(contact, oasDef.contact);
			const annotations = annotationConverter._import(oasDef.contact);
			if (!_.isEmpty(annotations)) contact.annotations = annotations;
			if (!_.isEmpty(contact)) model.contact = contact;
		}

		if (oasDef.hasOwnProperty('license')) {
			const license = {};
			_.assign(license, oasDef.license);
			const annotations = annotationConverter._import(oasDef.license);
			if (!_.isEmpty(annotations)) license.annotations = annotations;
			if (!_.isEmpty(license)) model.license = license;
		}

		const annotations = annotationConverter._import(oasDef);
		if (!_.isEmpty(annotations)) model.annotations = annotations;

		return model;
	}

	static copyObjectFrom(object, attrIdMap, attrIdSkip, annotationPrefix) {
		const result = new Info();

		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;

			if (attrIdSkip.indexOf(id) < 0 && !id.startsWith(annotationPrefix) && !id.startsWith('x-')) {
				result[attrIdMap.hasOwnProperty(id) ? attrIdMap[id] : id] = object[id];
			}
		}

		return result;
	}

}

module.exports = Oas20InfoConverter;