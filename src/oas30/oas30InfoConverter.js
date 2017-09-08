// @flow
const Converter = require('../converters/converter');
const ConverterModel = require('oas-raml-converter-model');
const Oas20AnnotationConverter = require('../oas20/oas20AnnotationConverter');
const Info = ConverterModel.Info;
const _ = require('lodash');

const { Contact, License } = require('./oas30Types');

const OasInfo = require('./oas30Types').Info;

class Oas30InfoConverter extends Converter {

	export(model: Info): OasInfo {
		if (_.isEmpty(model)) return new OasInfo();

		const info: OasInfo = new OasInfo(model.title, String(model.version));

		info.description = model.description;
		info.termsOfService = model.termsOfService;

		if(model.contact != null) {
			const contact = new Contact();
			contact.name = model.contact.name;
			contact.url = model.contact.url;
			contact.email = model.contact.email;
			info.contact = contact;
		}

		if(model.license != null) {
			const license = new License(model.license.name || '');
			license.url = model.license.url;
			info.license = license;
		}

		if(model.annotations != null) {
			const annotationConverter = new Oas20AnnotationConverter();
			_.assign(info, annotationConverter._export(model));
		}

		return info;
	}
}

module.exports = Oas30InfoConverter;
