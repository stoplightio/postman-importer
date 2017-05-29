const _ = require('lodash');
const Info = require('../model/info');
const Converter = require('../model/converter');
const Raml10RootConverter = require('../raml10/Raml10RootConverter');
const Raml10AnnotationConverter = require('../raml10/Raml10AnnotationConverter');
const Raml10CustomAnnotationConverter = require('../raml10/Raml10CustomAnnotationConverter');

class Raml10InfoConverter extends Converter {

	constructor(model, annotationPrefix , ramlDef) {
		super(model);
		this.annotationPrefix = annotationPrefix;
		this.ramlDef = ramlDef;
	}
	
	export(model) {
		return _.isEmpty(model)? {} : this._export(model);
	}

	import(ramlDef) {
		return _.isEmpty(ramlDef)? {} : this._import(ramlDef);
	}

	_export(model) {
		const attrIdMap = {};
		const attrIdSkip = ['description', 'contact', 'license', 'termsOfService', 'version', 'annotations'];
		const ramlDef = Raml10InfoConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);

		if (model.hasOwnProperty('description') && !_.isEmpty(model.description)) ramlDef.description = model.description;
		
		if (model.hasOwnProperty('version')) {
			const intVersion = parseInt(model.version);
			ramlDef.version = model.version === intVersion.toString() ? intVersion : model.version;
		}
		
		const oasInfo = {};
		if (model.hasOwnProperty('termsOfService')) oasInfo.termsOfService = model.termsOfService;

		if (model.hasOwnProperty('contact')) {
			const contact = {};
			if (model.contact.hasOwnProperty('name')) contact.name = model.contact.name;
			if (model.contact.hasOwnProperty('url')) contact.url = model.contact.url;
			if (model.contact.hasOwnProperty('email')) contact.email = model.contact.email;
			if (model.contact.hasOwnProperty('annotations') && _.isArray(model.contact.annotations) && !_.isEmpty(model.contact.annotations)) {
				const annotationConverter = new Raml10AnnotationConverter(this.model, this.annotationPrefix, this.ramlDef);
				_.assign(contact, annotationConverter._export(model.contact));
			}
			if (!_.isEmpty(contact)) oasInfo.contact = contact;
		}

		if (model.hasOwnProperty('license')) {
			const license = {};
			if (model.license.hasOwnProperty('name')) license.name = model.license.name;
			if (model.license.hasOwnProperty('url')) license.url = model.license.url;
			if (model.license.hasOwnProperty('annotations') && _.isArray(model.license.annotations) && !_.isEmpty(model.license.annotations)) {
				const annotationConverter = new Raml10AnnotationConverter(this.model, this.annotationPrefix, this.ramlDef);
				_.assign(license, annotationConverter._export(model.license));
			}
			if (!_.isEmpty(license)) oasInfo.license = license;
		}

		if (model.hasOwnProperty('annotations') && _.isArray(model.annotations) && !_.isEmpty(model.annotations)) {
			const annotationConverter = new Raml10AnnotationConverter(this.model, this.annotationPrefix, this.ramlDef);
			_.assign(oasInfo, annotationConverter._export(model));
		}
		
		if (!_.isEmpty(oasInfo)) {
			const id = this.annotationPrefix + '-info';
			const annotationId = '(' + id + ')';
			ramlDef[annotationId] = oasInfo;
			if (!this.model.annotationTypes || !this.model.annotationTypes.hasOwnProperty('oas-info'))
				Raml10CustomAnnotationConverter._createAnnotationType(ramlDef, this.annotationPrefix, id);
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
					const contact = {};
					_.assign(contact, oasInfo.contact);
					if (!_.isEmpty(contact)) model.contact = contact;
				}
				if (oasInfo.hasOwnProperty('license')) {
					const license = {};
					_.assign(license, oasInfo.license);
					if (!_.isEmpty(license)) model.license = license;
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