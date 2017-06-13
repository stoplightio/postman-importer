const _ = require('lodash');
const Converter = require('../model/converter');
const MediaType = require('../model/mediaType');
const BaseUri = require('../model/baseUri');
const Root = require('../model/root');
const Response = require('../model/response');
const Body = require('../model/body');
const Parameter = require('../model/parameter');
const Tag = require('../model/tag');
const ExternalDocumentation = require('../model/externalDocumentation');
const Oas20InfoConverter = require('../oas20/Oas20InfoConverter');
const Oas20AnnotationConverter = require('../oas20/Oas20AnnotationConverter');
const Oas20DefinitionConverter = require('../oas20/Oas20DefinitionConverter');
const urlHelper = require('../utils/url');
const url = require('url');
const oasHelper = require('../helpers/oas20');

class Oas20RootConverter extends Converter {

	export(model) {
		return _.isEmpty(model)? {} : this._export(model);
	}

	_export(model) {
		const attrIdMap = {};
		const attrIdSkip = ['info', 'baseUri', 'protocols', 'mediaType', 'documentation', 'baseUriParameters', 'securityDefinitions', 'resources', 'types', 'resourceTypes', 'traits', 'annotationTypes', 'tags', 'annotations'];
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
			Oas20RootConverter.exportAnnotations(model.baseUri, oasDef);
		}
		
		if (model.hasOwnProperty('protocols')) {
			const schemes = [];
			model.protocols.map(protocol => {
				if (oasHelper.getAcceptedSchemes.includes(protocol)) schemes.push(protocol);
			});
			oasDef.schemes = schemes;
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
				if (!_.isEmpty(result)) tags.push(result);
			});
			if (!_.isEmpty(tags)) model.tags = tags;
		}

		if (oasDef.hasOwnProperty('externalDocs')) {
			const defExternalDocs = oasDef.externalDocs;
			const externalDocs = new ExternalDocumentation();
			if (defExternalDocs.hasOwnProperty('url')) externalDocs.url = defExternalDocs.url;
			if (defExternalDocs.hasOwnProperty('description')) externalDocs.description = defExternalDocs.description;
			Oas20RootConverter.importAnnotations(oasDef.externalDocs, externalDocs, this.model);
			if (!_.isEmpty(externalDocs)) model.externalDocs = externalDocs;
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
			let baseProtocol;
			if (baseUri.host) {
				baseProtocol = model.protocols ? model.protocols[0] : 'http';
			}
			baseUri.uri = (baseProtocol ? baseProtocol + '://' : "") +
										(baseUri.host ? baseUri.host : "") +
										(baseUri.basePath? baseUri.basePath : "");
		}
		if (!_.isEmpty(baseUri) && baseUri.uri !== "") model.baseUri = baseUri;

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
		
		if (oasDef.hasOwnProperty('responses') && !_.isEmpty(oasDef.responses)) {
			const definitionConverter = new Oas20DefinitionConverter();
			const responses = [];
			for (const name in oasDef.responses) {
				if (!oasDef.responses.hasOwnProperty(name)) continue;
				
				const response = oasDef.responses[name];
				const responseModel = new Response();
				responseModel.httpStatusCode = response.code;
				responseModel.name = name;
				if (response.hasOwnProperty('description')) responseModel.description = response.description;
				if (response.hasOwnProperty('schema')) {
					const bodyModel = new Body();
					bodyModel.definition = definitionConverter._import(response.schema);
					responseModel.bodies = [bodyModel];
				}
				if (response.hasOwnProperty('headers')) {
					const headers = [];
					for (const headerName in response.headers) {
						const header = response.headers[headerName];
						const headerModel = new Parameter();
						headerModel.name = headerName;
						headerModel.definition = definitionConverter._import(header);
						headers.push(headerModel);
					}
					responseModel.headers = headers;
				}
				responses.push(responseModel);
			}
			model.responses = responses;
		}
		
		Oas20RootConverter.importAnnotations(oasDef, model, model);

		return model;
	}
	
	static importAnnotations(source, target, model) {
		const annotationConverter = new Oas20AnnotationConverter(model);
		const annotations = annotationConverter._import(source);
		if (!_.isEmpty(annotations)) target.annotations = annotations;
	}

}

module.exports = Oas20RootConverter;