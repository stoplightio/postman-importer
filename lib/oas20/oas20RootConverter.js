const _ = require('lodash');
const Converter = require('../model/converter');
const MediaType = require('../model/mediaType');
const BaseUri = require('../model/baseUri');
const Root = require('../model/root');
const Tag = require('../model/tag');
const ExternalDocumentation = require('../model/externalDocumentation');
const AnnotationType = require('../model/annotationType');
const AnnotationTypeConverter = require('../common/annotationTypeConverter');
const Oas20InfoConverter = require('../oas20/Oas20InfoConverter');
const Oas20AnnotationConverter = require('../oas20/Oas20AnnotationConverter');
const url = require('url');

class Oas20RootConverter extends Converter{

	export(model) {
		return _.isEmpty(model)? {} : this._export(model);
	}

	_export(model) {
		const attrIdMap = {
			'protocols': 'schemes'
		};
		const attrIdSkip = ['info', 'baseUri', 'mediaType', 'documentation', 'baseUriParameters', 'securityDefinitions', 'resources', 'types', 'resourceTypes', 'traits', 'annotationTypes', 'tags', 'annotations'];
		const oasDef = Converter.copyObjectFrom(model, attrIdMap, attrIdSkip);

		if (model.hasOwnProperty('info')) {
			const infoConverter = new Oas20InfoConverter();
			oasDef.info = infoConverter.export(model.info);
		}

		if (model.hasOwnProperty('baseUri')) {
			const baseUri = model.baseUri;
			if (baseUri.hasOwnProperty('host')) oasDef.host = baseUri.host;
			if (baseUri.hasOwnProperty('basePath')) oasDef.basePath = baseUri.basePath;
			if (!oasDef.host && baseUri.uri){
				let protocol = url.parse(baseUri.uri).protocol;
				if (protocol){
					protocol = protocol.slice(0, -1).toLowerCase();
					oasDef['x-basePath'] = baseUri.uri.replace(protocol + '://','');
					if (oasDef.schemes) {
						oasDef.schemes.push(protocol);
					} else {
						oasDef.schemes = [protocol];
					}
				} else {
					oasDef['x-basePath'] = baseUri.uri;
				}
			}
		}

		if (model.hasOwnProperty('tags')) {
			oasDef.tags = [];
			model.tags.map( tag => {
				const result = {};
				if (tag.hasOwnProperty('name')) result.name = tag.name;
				if (tag.hasOwnProperty('description')) result.description = tag.description;
				if (tag.hasOwnProperty('externalDocs')) result.externalDocs = tag.externalDocs;
				if (!_.isEmpty(result)) {
					oasDef.tags.push(result);
				}
			});
		}

		if (model.hasOwnProperty('mediaType')) {
			const mediaType = model.mediaType;
			if (mediaType.hasOwnProperty('consumes')) oasDef.consumes = mediaType.consumes;
			if (mediaType.hasOwnProperty('produces')) oasDef.produces = mediaType.produces;
		}
		
		if (model.hasOwnProperty('annotations')) {
			if (_.isArray(model.annotations) && !_.isEmpty(model.annotations)) {
				const annotationConverter = new Oas20AnnotationConverter();
				_.assign(oasDef, annotationConverter._export(model));
			}
		}

		return oasDef;
	}
	
	import(oasDef) {
		return _.isEmpty(oasDef)? {} : this._import(oasDef);
	}

	_import(oasDef) {
		const model = new Root();

		if (oasDef.hasOwnProperty('schemes')) model.protocols = oasDef.schemes;

		if (oasDef.hasOwnProperty('info')) {
			const infoConverter = new Oas20InfoConverter();
			model.info = infoConverter.import(oasDef.info);
		}

		if (oasDef.hasOwnProperty('tags')) {
			const tags = [];
			oasDef.tags.map( tag => {
				const result = new Tag();
				if (tag.hasOwnProperty('name')) result.name = tag.name;
				if (tag.hasOwnProperty('description')) result.description = tag.description;
				if (tag.hasOwnProperty('externalDocs')) {
					const externalDocs = new ExternalDocumentation();
					if (tag.externalDocs.hasOwnProperty('description')) externalDocs.description = tag.externalDocs.description;
					if (tag.externalDocs.hasOwnProperty('url')) externalDocs.url = tag.externalDocs.url;
					if (!_.isEmpty(externalDocs)) {
						result.externalDocs = externalDocs;
					}
				}
				if (!_.isEmpty(result)) {
					tags.push(result);
				}
			});
			if (!_.isEmpty(tags)) {
				model.tags = tags;
				const annotationTypes = model.annotationTypes ? model.annotationTypes: [];
				const tagAnnotationType = {
					type: ['array'],
					name: 'oas-tags-definition',
					allowedTargets: ['API'],
					items: {
						properties: {
							name: {
								type: 'string'
							},
							description: {
								type: 'string',
								required: 'false'
							},
							externalDocs: {
								required: 'false',
								properties: {
									url: {
										type: 'string'
									},
									description: {
										type: 'string',
										required: 'false'
									}
								}
							}
						}
					}
				};
				const annotationTypeConverter = new AnnotationTypeConverter();
				annotationTypes.push(annotationTypeConverter._import(tagAnnotationType));
				model.annotationTypes = annotationTypes;
			}
		}

		const baseUri = new BaseUri();
		if (oasDef.hasOwnProperty('x-basePath')) {
			baseUri.uri = oasDef['x-basePath'];
			if (oasDef.hasOwnProperty('host')) baseUri.host = oasDef.host;
			const parsedURL = url.parse(baseUri.uri);
			if (parsedURL.host && !baseUri.host) {
				baseUri.host = parsedURL.host;
			}
		} else {
			if (oasDef.hasOwnProperty('host')) baseUri.host = oasDef.host;
			if (oasDef.hasOwnProperty('basePath')) baseUri.basePath = oasDef.basePath;
			if (baseUri.host) {
				let baseProtocol = 'http';
				if (model.protocols) {
					baseProtocol = model.protocols[0];
				}
				baseUri.uri = baseProtocol + '://' + baseUri.host + (baseUri.basePath? baseUri.basePath : "");
			}
		}
		if (!_.isEmpty(baseUri)) model.baseUri = baseUri;

		const mediaType = new MediaType();
		if (oasDef.hasOwnProperty('consumes')) {
			mediaType.consumes = oasDef.consumes;
			if (_.isEmpty(mediaType.mimeTypes)) {
				mediaType.mimeTypes = mediaType.consumes;
			} else {
				mediaType.mimeTypes = mediaType.mimeTypes.concat(mediaType.consumes);
			}
		}
		if (oasDef.hasOwnProperty('produces')) {
			mediaType.produces = oasDef.produces;
			if (_.isEmpty(mediaType.mimeTypes)) {
				mediaType.mimeTypes = mediaType.produces;
			} else {
				mediaType.mimeTypes = mediaType.mimeTypes.concat(mediaType.produces);
			}
		}
		if (!_.isEmpty(mediaType)) {
			model.mediaType = mediaType;
		}
		
		const annotationConverter = new Oas20AnnotationConverter(model);
		const annotations = annotationConverter._import(oasDef);
		if (!_.isEmpty(annotations)) model.annotations = annotations;

		return model;
	}
}

module.exports = Oas20RootConverter;