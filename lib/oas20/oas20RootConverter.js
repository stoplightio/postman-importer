const _ = require('lodash');
const Converter = require('../model/converter');
const MediaType = require('../model/mediaType');
const BaseUri = require('../model/baseUri');
const Root = require('../model/root');
const Tag = require('../model/tag');
const ExternalDocumentation = require('../model/externalDocumentation');
const AnnotationTypeConverter = require('../common/annotationTypeConverter');
const Oas20InfoConverter = require('../oas20/Oas20InfoConverter');
const Oas20AnnotationConverter = require('../oas20/Oas20AnnotationConverter');
const urlHelper = require('../utils/url');
const url = require('url');

class Oas20RootConverter extends Converter {

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
			if (baseUri.hasOwnProperty('basePath')) {
				if (urlHelper.isTemplateUri(baseUri.basePath)) {
					oasDef['x-basePath'] = baseUri.basePath;
				} else {
					oasDef.basePath = baseUri.basePath;
				}
			}
			if (!baseUri.host && !baseUri.basePath) {
				const parsedURL = url.parse(baseUri.uri);
				oasDef['x-basePath'] = parsedURL.protocol ? baseUri.uri.replace(parsedURL.protocol + '//', "") : baseUri.uri;
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
		
		Oas20RootConverter.exportAnnotations(model, oasDef);

		return oasDef;
	}
	
	static exportAnnotations(source, target) {
		if (source.hasOwnProperty('annotations') && _.isArray(source.annotations) && !_.isEmpty(source.annotations)) {
			const annotationConverter = new Oas20AnnotationConverter();
			_.assign(target, annotationConverter._export(source));
		}
	}
	
	import(oasDef) {
		return _.isEmpty(oasDef)? {} : this._import(oasDef);
	}

	_import(oasDef) {
		const model = new Root();

		if (oasDef.hasOwnProperty('schemes')) model.protocols = oasDef.schemes;

		if (oasDef.hasOwnProperty('info')) {
			const infoConverter = new Oas20InfoConverter(model);
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
				Oas20RootConverter.importTagAnnotationType(model);
			}
		}

		if (oasDef.hasOwnProperty('externalDocs')) {
			const defExternalDocs = oasDef.externalDocs;
			const externalDocs = new ExternalDocumentation();
			if (defExternalDocs.hasOwnProperty('url')) externalDocs.url = defExternalDocs.url;
			if (defExternalDocs.hasOwnProperty('description')) externalDocs.description = defExternalDocs.description;
			if (!_.isEmpty(externalDocs)) {
				model.externalDocs = externalDocs;
				Oas20RootConverter.importExternalDocsAnnotationType(model);
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
				const intersection = _.intersection(mediaType.mimeTypes, mediaType.consumes);
				mediaType.mimeTypes = mediaType.mimeTypes.concat(mediaType.consumes.filter(type => { return !intersection.includes(type);	}));
			}
		}
		if (oasDef.hasOwnProperty('produces')) {
			mediaType.produces = oasDef.produces;
			if (_.isEmpty(mediaType.mimeTypes)) {
				mediaType.mimeTypes = mediaType.produces;
			} else {
				const intersection = _.intersection(mediaType.mimeTypes, mediaType.produces);
				mediaType.mimeTypes = mediaType.mimeTypes.concat(mediaType.produces.filter(type => { return !intersection.includes(type);	}));
			}
		}
		if (!_.isEmpty(mediaType)) {
			model.mediaType = mediaType;
		}
		
		Oas20RootConverter.importAnnotations(oasDef, model, model);

		return model;
	}
	
	static importAnnotations(source, target, model) {
		const annotationConverter = new Oas20AnnotationConverter(model);
		const annotations = annotationConverter._import(source);
		if (!_.isEmpty(annotations)) target.annotations = annotations;
	}

	static importTagAnnotationType(model) {
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

	static importExternalDocsAnnotationType(model) {
    const annotationTypes = model.annotationTypes ? model.annotationTypes: [];
    const docsAnnotationType = {
      name: 'oas-externalDocs',
      allowedTargets: ['API', 'Method', 'TypeDeclaration'],
      properties: {
        description: {
          type: 'string',
          required: 'false'
        },
        url: {
          type: 'string',
        }
      }
    };
    const annotationTypeConverter = new AnnotationTypeConverter();
    annotationTypes.push(annotationTypeConverter._import(docsAnnotationType));
    model.annotationTypes = annotationTypes;
	}

}

module.exports = Oas20RootConverter;