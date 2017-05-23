const Converter = require('../model/converter');
const Oas20RootConverter = require('../oas20/Oas20RootConverter');
const Oas20AnnotationConverter = require('../oas20/Oas20AnnotationConverter');
const AnnotationTypeConverter = require('../common/AnnotationTypeConverter');
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

		if (oasDef.hasOwnProperty('contact')) {
			const attrContactIdMap = {
				'name' : 'contactName',
				'url' : 'contactUrl',
				'email' : 'contactEmail'
			};
			_.merge(model, Converter.copyObjectFrom(oasDef.contact, attrContactIdMap,[]));
		}

		if (oasDef.hasOwnProperty('license')) {
			const attrLicenseIdMap = {
				'name' : 'licenseName',
				'url' : 'licenseUrl'
			};
			_.merge(model, Converter.copyObjectFrom(oasDef.license, attrLicenseIdMap,[]));
		}

		const annotationConverter = new Oas20AnnotationConverter(this.model);
		const annotations = annotationConverter._import(oasDef);
		if (!_.isEmpty(annotations)) model.annotations = annotations;

		if (oasDef.hasOwnProperty('contact') || oasDef.hasOwnProperty('license') || oasDef.hasOwnProperty('termsOfService'))
			Oas20InfoConverter.importInfoAnnotationType(this.model);
		
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

	static importInfoAnnotationType(model) {
    const annotationTypes = model.annotationTypes ? model.annotationTypes: [];
    const infoAnnotationType = {
      name: 'oas-info',
      allowedTargets: ['API'],
			properties: {
      	termsOfService: {
      		type: 'string',
					required: 'false'
				},
				contact: {
      		required: 'false',
					properties: {
      			name: {
      				type: 'string',
							required: 'false'
						},
						url: {
      				type: 'string',
							required: 'false'
						},
						email: {
      				type: 'string',
							required: 'false'
						}
					}
				},
				license: {
      		required: 'false',
					properties: {
      			name: {
      				type: 'string',
							required: 'false'
						},
						url: {
      				type: 'string',
							required: 'false'
						}
					}
				}
			}
    };
    const annotationTypeConverter = new AnnotationTypeConverter();
    annotationTypes.push(annotationTypeConverter._import(infoAnnotationType));
		model.annotationTypes = annotationTypes;
	}

}

module.exports = Oas20InfoConverter;