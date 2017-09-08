// @flow
const ConverterModel = require('oas-raml-converter-model');
const Converter = require('../converters/converter');
const Oas20AnnotationConverter = require('../oas20/oas20AnnotationConverter');
const Info = ConverterModel.Info;
const InfoData = ConverterModel.InfoData;
const Annotation = ConverterModel.Annotation;
const _ = require('lodash');
const oasHelper = require('../helpers/oas20');

class Oas20InfoConverter extends Converter {
	
	export(model:Info) {
		return _.isEmpty(model)? {} : this._export(model);
	}

	import(oasDef:any) {
		return _.isEmpty(oasDef)? {} : this._import(oasDef);
	}

	_export(model:Info) {
		const attrIdMap = {};
		
		const attrIdSkip = ['version', 'contactName', 'contactUrl', 'contactEmail', 'licenseName', 'licenseUrl', 'annotations'];
		const annotationPrefix = oasHelper.getAnnotationPrefix;
		const annotationConverter = new Oas20AnnotationConverter();
		const oasDef = Oas20InfoConverter.createOasDef(model, attrIdMap, attrIdSkip, annotationPrefix);

		oasDef.version = model.hasOwnProperty('version') && model.version ? model.version.toString() : '';
		
		if (model.hasOwnProperty('contact') && model.contact != null) {
			const contact = {};
			const contactModel: InfoData = model.contact;
			if (contactModel.hasOwnProperty('name')) contact.name = contactModel.name;
			if (contactModel.hasOwnProperty('url')) contact.url = contactModel.url;
			if (contactModel.hasOwnProperty('email')) contact.email = contactModel.email;
			
			if (!_.isEmpty(contact)) oasDef.contact = contact;
		}

		if (model.hasOwnProperty('license') && model.license != null) {
			const license = {};
			const licenseModel: InfoData = model.license;
			if (licenseModel.hasOwnProperty('name')) license.name = licenseModel.name;
			if (licenseModel.hasOwnProperty('url')) license.url = licenseModel.url;

			if (!_.isEmpty(license)) oasDef.license = license;
		}

		if (model.hasOwnProperty('annotations')) {
			_.assign(oasDef, annotationConverter._export(model));
		}

		return oasDef;
	}

	_import(oasDef:any) {
		const attrIdMap = {};
		const attrIdSkip = ['contact', 'license'];
		const model = Oas20InfoConverter.createInfo(oasDef, attrIdMap, attrIdSkip);
		const annotationConverter = new Oas20AnnotationConverter(this.model);
		
		if (oasDef.hasOwnProperty('contact')) {
			const contact = new InfoData();
			_.assign(contact, oasDef.contact);
			const annotations: Annotation[] = annotationConverter._import(oasDef.contact);
			if (!_.isEmpty(annotations)) contact.annotations = annotations;
			if (!_.isEmpty(contact)) model.contact = contact;
		}

		if (oasDef.hasOwnProperty('license')) {
			const license = new InfoData();
			_.assign(license, oasDef.license);
			const annotations: Annotation[] = annotationConverter._import(oasDef.license);
			if (!_.isEmpty(annotations)) license.annotations = annotations;
			if (!_.isEmpty(license)) model.license = license;
		}

		const annotations: Annotation[] = annotationConverter._import(oasDef);
		if (!_.isEmpty(annotations)) model.annotations = annotations;

		return model;
	}

	static createOasDef(info, attrIdMap, attrIdSkip, annotationPrefix) {
		const result = {};
		
		_.assign(result, info);
		attrIdSkip.map(id => {
			delete result[id];
		});
		_.keys(attrIdMap).map(id => {
			result[attrIdMap[id]] = result[id];
			delete result[id];
		});
		for (const id in result) {
			if (!info.hasOwnProperty(id)) continue;
			if (id.startsWith(annotationPrefix) || id.startsWith('x-')) {
				delete result[id];
			}
		}
		
		return result;
	}
	
	static createInfo(oasDef, attrIdMap, attrIdSkip) {
		const object = {};
		
		_.entries(oasDef).map(([key, value]) => {
			if (attrIdSkip.indexOf(key) < 0 && !key.startsWith('x-')) {
				object[attrIdMap.hasOwnProperty(key) ? attrIdMap[key] : key] = value;
			}
		});
		const result = new Info();
		_.assign(result, object);
		
		return result;
	}

}

module.exports = Oas20InfoConverter;
