const _ = require('lodash');
const Info = require('../model/info');
const Converter = require('../model/converter');
const Raml10RootConverter = require('../raml10/Raml10RootConverter');
const Raml10AnnotationConverter = require('../raml10/Raml10AnnotationConverter');
const Raml10CustomAnnotationConverter = require('../raml10/Raml10CustomAnnotationConverter');

class Raml10InfoConverter extends Converter {

	constructor(model) {
		super(model);
		this.annotationPrefix = 'oas';
	}
	
	export(model) {
		return _.isEmpty(model)? {} : this._export(model);
	}

	import(ramlDef) {
		return _.isEmpty(ramlDef)? {} : this._import(ramlDef);
	}

	_export(model) {
		const attrIdMap = {};
		const attrIdSkip = ['contactName', 'contactUrl', 'contactEmail', 'licenseName', 'licenseUrl', 'termsOfService', 'version', 'annotations'];
		const ramlDef = Raml10InfoConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);

		if (model.hasOwnProperty('version')) {
			const intVersion = parseInt(model.version);
			ramlDef.version = model.version === intVersion.toString() ? intVersion : model.version;
		}
		
		const oasInfo = {};
		if (model.hasOwnProperty('termsOfService')) oasInfo.termsOfService = model.termsOfService;

		let contact = {};
		if (model.hasOwnProperty('contactName')) contact.name = model.contactName;
		if (model.hasOwnProperty('contactUrl')) contact.url = model.contactUrl;
		if (model.hasOwnProperty('contactEmail')) contact.email = model.contactEmail;
		if (!_.isEmpty(contact)) oasInfo.contact = contact;

		const license = {};
		if (model.hasOwnProperty('licenseName')) license.name = model.licenseName;
		if (model.hasOwnProperty('licenseUrl')) license.url = model.licenseUrl;
		if (!_.isEmpty(license)) oasInfo.license = license;

		if (model.hasOwnProperty('annotations') && _.isArray(model.annotations) && !_.isEmpty(model.annotations)) {
			const annotationConverter = new Raml10AnnotationConverter();
			const annotations = annotationConverter._export(model);
			_.assign(oasInfo, annotations);
		}
		
		if (!_.isEmpty(oasInfo)) {
			const id = this.annotationPrefix + '-info';
			const annotationId = '(' + id + ')';
			ramlDef[annotationId] = oasInfo;
			Raml10CustomAnnotationConverter._createAnnotation(this.model, this.annotationPrefix, id);
		}
		
		return ramlDef;
	}

	_import(ramlDef) {
		const model = new Info();

		if (ramlDef.hasOwnProperty('title')) model.title = ramlDef.title;
		if (ramlDef.hasOwnProperty('description')) model.description = ramlDef.description;
		if (ramlDef.hasOwnProperty('version')) model.version = ramlDef.version;

		if (ramlDef.hasOwnProperty('annotations')){
			let annotations = ramlDef.annotations;
			if (annotations.hasOwnProperty('oas-info')) {
				let oasInfo = annotations['oas-info'].structuredValue;
				if (oasInfo.hasOwnProperty('termsOfService')) model.termsOfService = oasInfo.termsOfService;
				if (oasInfo.hasOwnProperty('contact')) {
					let contact = oasInfo.contact;
					if (contact.hasOwnProperty('name')) model.contactName = contact.name;
					if (contact.hasOwnProperty('url')) model.contactUrl = contact.url;
					if (contact.hasOwnProperty('email')) model.contactEmail= contact.email;
				}
				if (oasInfo.hasOwnProperty('license')) {
					let license = oasInfo.license;
					if (license.hasOwnProperty('name')) model.licenseName = license.name;
					if (license.hasOwnProperty('url')) model.licenseUrl = license.url;
				}
			}
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

module.exports = Raml10InfoConverter;