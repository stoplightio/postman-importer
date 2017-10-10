// @flow
const _ = require('lodash');
const ConverterModel = require('oas-raml-converter-model');
const Info = ConverterModel.Info;
const InfoData = ConverterModel.InfoData;
const Converter = require('../converters/converter');
const ramlHelper = require('../helpers/raml');
const RamlAnnotationConverter = require('../raml/ramlAnnotationConverter');
const RamlCustomAnnotationConverter = require('../raml/ramlCustomAnnotationConverter');

class RamlInfoConverter extends Converter {
	
	export(model:Info) {
		return _.isEmpty(model)? {} : this._export(model);
	}

	import(ramlDef:any) {
		return _.isEmpty(ramlDef)? {} : this._import(ramlDef);
	}

	_export(model:Info) {
		const attrIdMap = {};
		const attrIdSkip = ['description', 'contact', 'license', 'termsOfService', 'version', 'annotations'];
		const ramlDef = RamlInfoConverter.createRamlDef(model, attrIdMap, attrIdSkip);

		if (model.hasOwnProperty('description') && !_.isEmpty(model.description)) ramlDef.description = model.description;
		
		if (model.hasOwnProperty('version') && model.version !== '') {
			const intVersion = parseInt(model.version);
			ramlDef.version = model.version === intVersion.toString() ? intVersion : model.version;
		}
		
		const oasInfo = {};
		if (model.hasOwnProperty('termsOfService')) oasInfo.termsOfService = model.termsOfService;

		if (model.hasOwnProperty('contact') && model.contact != null) {
			const contact = {};
			const contactModel: InfoData = model.contact;
			if (contactModel.hasOwnProperty('name')) contact.name = contactModel.name;
			if (contactModel.hasOwnProperty('url')) contact.url = contactModel.url;
			if (contactModel.hasOwnProperty('email')) contact.email = contactModel.email;
			if (contactModel.hasOwnProperty('annotations') && _.isArray(contactModel.annotations) && !_.isEmpty(contactModel.annotations)) {
				const annotationConverter = new RamlAnnotationConverter(this.model, this.annotationPrefix, this.def);
				_.assign(contact, annotationConverter._export(contactModel));
			}
			if (!_.isEmpty(contact)) oasInfo.contact = contact;
		}

		if (model.hasOwnProperty('license') && model.license != null) {
			const license = {};
			const licenseModel: InfoData = model.license;
			if (licenseModel.hasOwnProperty('name')) license.name = licenseModel.name;
			if (licenseModel.hasOwnProperty('url')) license.url = licenseModel.url;
			if (licenseModel.hasOwnProperty('annotations') && _.isArray(licenseModel.annotations) && !_.isEmpty(licenseModel.annotations)) {
				const annotationConverter = new RamlAnnotationConverter(this.model, this.annotationPrefix, this.def);
				_.assign(license, annotationConverter._export(licenseModel));
			}
			if (!_.isEmpty(license)) oasInfo.license = license;
		}

		if (model.hasOwnProperty('annotations') && _.isArray(model.annotations) && !_.isEmpty(model.annotations)) {
			const annotationConverter = new RamlAnnotationConverter(this.model, this.annotationPrefix, this.def);
			_.assign(oasInfo, annotationConverter._export(model));
		}
		
		if (!_.isEmpty(oasInfo)) {
			const id = this.annotationPrefix + '-info';
			const annotationId = '(' + id + ')';
			ramlDef[annotationId] = oasInfo;
			if (!this.model.annotationTypes || !this.model.annotationTypes.hasOwnProperty('oas-info'))
				RamlCustomAnnotationConverter._createAnnotationType(ramlDef, this.annotationPrefix, id);
		}
		
		return ramlDef;
	}

	_import(ramlDef:any) {
		const model = new Info();

		if (ramlDef.hasOwnProperty('title')) model.title = ramlDef.title;
		if (ramlDef.hasOwnProperty('description')) model.description = ramlDef.description;
		if (ramlDef.hasOwnProperty('version')) model.version = ramlDef.version;

		if (ramlHelper.isRaml08Version(this.version) && ramlDef.hasOwnProperty('documentation') && !_.isEmpty(ramlDef.documentation) && !model.description) {
			const documentation = ramlDef.documentation[0];
			if (documentation.hasOwnProperty('content') && !_.isEmpty(documentation.content)) model.description = documentation.content;
		}
		
		if (ramlDef.hasOwnProperty('annotations')){
			let annotations = ramlDef.annotations;
			if (annotations.hasOwnProperty('oas-info')) {
				let oasInfo = annotations['oas-info'].structuredValue;
				if (oasInfo.hasOwnProperty('termsOfService')) {
					model.termsOfService = oasInfo.termsOfService;
					delete oasInfo.termsOfService;
				}
				if (oasInfo.hasOwnProperty('contact')) {
					const contact = new InfoData();
					_.assign(contact, oasInfo.contact);
					if (!_.isEmpty(contact)) model.contact = contact;
					delete oasInfo.contact;
				}
				if (oasInfo.hasOwnProperty('license')) {
					const license = new InfoData();
					_.assign(license, oasInfo.license);
					if (!_.isEmpty(license)) model.license = license;
					delete oasInfo.license;
				}

				RamlAnnotationConverter.importAnnotations({annotations: oasInfo}, model, this.model);
			}
		}

		return model;
	}

	static createRamlDef(info, attrIdMap, attrIdSkip) {
		const result = {};

		_.assign(result, info);
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

module.exports = RamlInfoConverter;
