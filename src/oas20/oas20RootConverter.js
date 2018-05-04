// @flow
const _ = require('lodash');
const ConverterModel = require('oas-raml-converter-model');
const Converter = require('../converters/converter');
const Info = ConverterModel.Info;
const MediaType = ConverterModel.MediaType;
const BaseUri = ConverterModel.BaseUri;
const Definition = ConverterModel.Definition;
const Header = ConverterModel.Header;
const Root = ConverterModel.Root;
const Response = ConverterModel.Response;
const Body = ConverterModel.Body;
const Tag = ConverterModel.Tag;
const ExternalDocumentation = ConverterModel.ExternalDocumentation;
const Annotation = ConverterModel.Annotation;
const Oas20InfoConverter = require('../oas20/oas20InfoConverter');
const Oas20AnnotationConverter = require('../oas20/oas20AnnotationConverter');
const Oas20DefinitionConverter = require('../oas20/oas20DefinitionConverter');
const urlHelper = require('../utils/url');
const url = require('url');
const oasHelper = require('../helpers/oas20');

class Oas20RootConverter extends Converter {

	export(model:Root) {
		return _.isEmpty(model)? {} : this._export(model);
	}

	_export(model:Root) {
		const attrIdMap = {};
		const attrIdSkip = ['info', 'baseUri', 'protocols', 'mediaType', 'documentation', 'baseUriParameters', 'securityDefinitions', 'resources', 'types', 'resourceTypes', 'traits', 'annotationTypes', 'tags', 'annotations'];
		const oasDef = Oas20RootConverter.createOasDef(model, attrIdMap, attrIdSkip);

		if (model.hasOwnProperty('info')) {
			const info: Info = model.info;
			const infoConverter = new Oas20InfoConverter();
			oasDef.info = infoConverter.export(info);
		}

		if (model.hasOwnProperty('baseUri') && model.baseUri) {
			const baseUri: BaseUri = model.baseUri;
			if (baseUri.host != null && urlHelper.isTemplateUri(baseUri.host)) {
				oasDef['x-basePath'] = baseUri.host + (baseUri.basePath != null ? baseUri.basePath : '');
			} else {
				if (baseUri.hasOwnProperty('host') && !_.isEmpty(baseUri.host)) oasDef.host = baseUri.host;
				if (baseUri.hasOwnProperty('basePath') && !_.isEmpty(baseUri.basePath)) {
					if (urlHelper.isTemplateUri(baseUri.basePath)) {
						oasDef['x-basePath'] = baseUri.basePath;
					} else {
						oasDef.basePath = baseUri.basePath;
					}
				}
				if (!baseUri.host && !baseUri.basePath) {
					const uri: ?string = baseUri.uri;
					if (uri != null) {
						const parsedURL = url.parse(uri);
						oasDef['x-basePath'] = parsedURL.protocol ? uri.replace(parsedURL.protocol + '//', '') : uri;
					}
				}
			}
			Oas20RootConverter.exportAnnotations(baseUri, oasDef);
		}
		
		if (model.hasOwnProperty('protocols') && model.protocols) {
			const protocols: string[] = model.protocols;
			const schemes: string[] = [];
			for (let i = 0; i < protocols.length; i++) {
				const protocol: string = protocols[i];
				if (oasHelper.getAcceptedSchemes.includes(protocol)) schemes.push(protocol);
			}
			oasDef.schemes = schemes;
		}

		if (model.hasOwnProperty('tags') && model.tags) {
			const tags: Tag[] = model.tags;
			oasDef.tags = [];
			for (let i = 0; i < tags.length; i++) {
				const tag: Tag = tags[i];
				const result = {};
				if (tag.hasOwnProperty('name')) result.name = tag.name;
				if (tag.hasOwnProperty('description')) result.description = tag.description;
				if (tag.hasOwnProperty('externalDocs')) result.externalDocs = tag.externalDocs;
				if (!_.isEmpty(result)) {
					oasDef.tags.push(result);
				}
			}
		}

		if (model.hasOwnProperty('mediaType') && model.mediaType) {
			const mediaType: MediaType = model.mediaType;
			if (mediaType.hasOwnProperty('consumes')) oasDef.consumes = mediaType.consumes;
			if (mediaType.hasOwnProperty('produces')) oasDef.produces = mediaType.produces;
		}

		if (oasDef.hasOwnProperty('responses')) {
			for (const id in oasDef.responses) {
				if (!oasDef.responses.hasOwnProperty(id)) continue;

				const response = oasDef.responses[id];
				if (!response.httpStatusCode) delete response.httpStatusCode;
			}
		}

		Oas20RootConverter.exportAnnotations(model, oasDef);

		return oasDef;
	}
	
	static exportAnnotations(source:any, target:any) {
		if (source.hasOwnProperty('annotations') && _.isArray(source.annotations) && !_.isEmpty(source.annotations)) {
			const annotationConverter = new Oas20AnnotationConverter();
			_.assign(target, annotationConverter._export(source));
		}
	}
	
	import(oasDef:any) {
		return _.isEmpty(oasDef)? {} : this._import(oasDef);
	}

	_import(oasDef:any) {
		const model = new Root();

		if (oasDef.hasOwnProperty('schemes')) {
			const protocols: string[] = oasDef.schemes;
			model.protocols = protocols;
		}

		if (oasDef.hasOwnProperty('info')) {
			const infoConverter = new Oas20InfoConverter(model);
			const info: Info = infoConverter.import(oasDef.info);
			model.info = info;
		}

		if (oasDef.hasOwnProperty('tags')) {
			const tags: Tag[] = [];
			oasDef.tags.map(tag => {
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
			if (!_.isEmpty(externalDocs)) {
				model.externalDocs = externalDocs;
			}
		}

		const baseUri = new BaseUri();
		if (oasDef.hasOwnProperty('x-basePath')) {
			baseUri.uri = oasDef['x-basePath'];
			if (oasDef.hasOwnProperty('host')) baseUri.host = oasDef.host;
			const uri: ?string = baseUri.uri;
			if (uri != null) {
				const parsedURL = url.parse(uri);
				if (parsedURL.host && !baseUri.host) {
					baseUri.host = parsedURL.host;
				}
			}
		} else {
			if (oasDef.hasOwnProperty('host')) baseUri.host = oasDef.host;
			if (oasDef.hasOwnProperty('basePath')) baseUri.basePath = oasDef.basePath;
			let baseProtocol;
			if (baseUri.host) {
				baseProtocol = model.protocols ? model.protocols[0] : 'http';
			}
			baseUri.uri = (baseProtocol ? baseProtocol + '://' : '') +
										(baseUri.host ? baseUri.host : '') +
										(baseUri.basePath? baseUri.basePath : '');
		}
		if (!_.isEmpty(baseUri) && baseUri.uri !== '') model.baseUri = baseUri;

		const mediaType = new MediaType();
		if (oasDef.hasOwnProperty('consumes')) {
			const mimeTypes: string[] = mediaType.mimeTypes;
			const consumes: string[] = oasDef.consumes;
			mediaType.consumes = consumes;
			if (_.isEmpty(mimeTypes)) {
				mediaType.mimeTypes = consumes;
			} else {
				const intersection = _.intersection(mimeTypes, consumes);
				mediaType.mimeTypes = mimeTypes.concat(consumes.filter(type => { return !intersection.includes(type);	}));
			}
		}
		if (oasDef.hasOwnProperty('produces')) {
			const mimeTypes: string[] = mediaType.mimeTypes;
			const produces: string[] = oasDef.produces;
			mediaType.produces = produces;
			if (_.isEmpty(mimeTypes)) {
				mediaType.mimeTypes = produces;
			} else {
				const intersection = _.intersection(mimeTypes, produces);
				mediaType.mimeTypes = mimeTypes.concat(produces.filter(type => { return !intersection.includes(type);	}));
			}
		}
		if (!_.isEmpty(mediaType)) {
			model.mediaType = mediaType;
		}
		
		if (oasDef.hasOwnProperty('responses') && !_.isEmpty(oasDef.responses)) {
			const definitionConverter = new Oas20DefinitionConverter();
			const responses: Response[] = [];
			for (const name in oasDef.responses) {
				if (!oasDef.responses.hasOwnProperty(name)) continue;
				
				const response = oasDef.responses[name];
				const responseModel = new Response();
				responseModel.httpStatusCode = response.code;
				responseModel.name = name;
				if (response.hasOwnProperty('description')) responseModel.description = response.description;
				if (response.hasOwnProperty('schema')) {
					const bodyModel = new Body();
					const definition: Definition = definitionConverter._import(response.schema);
					bodyModel.definition = definition;
					const bodies: Body[] = [bodyModel];
					responseModel.bodies = bodies;
				}
				if (response.hasOwnProperty('headers')) {
					const headers: Header[] = [];
					for (const headerName in response.headers) {
						const header = response.headers[headerName];
						const headerModel = new Header();
						headerModel.name = headerName;
						const definition: Definition = definitionConverter._import(header);
						headerModel.definition = definition;
						headers.push(headerModel);
					}
					responseModel.headers = headers;
				}
				responses.push(responseModel);
			}
			model.responses = responses;
		}

		if (oasDef.hasOwnProperty('security')) {
			model.securedBy = [];
			oasDef.security.map(sec => {
				const key = _.keys(sec)[0];
				const obj = {};
				obj[key] = {scopes: sec[key]};
				model.securedBy = model.securedBy.concat(sec[key].length === 0 ? key : obj);
			});
		}

		Oas20RootConverter.importAnnotations(oasDef, model, model);

		return model;
	}
	
	static createOasDef(root:Root, attrIdMap, attrIdSkip) {
		const result = {};
		
		_.assign(result, root);
		attrIdSkip.map(id => {
			delete result[id];
		});
		_.keys(attrIdMap).map(id => {
			result[attrIdMap[id]] = result[id];
			delete result[id];
		});
		
		return result;
	}
	
	static importAnnotations(source:any, target:any, model:Root) {
		const annotationConverter = new Oas20AnnotationConverter(model);
		const annotations: Annotation[] = annotationConverter._import(source);
		if (!_.isEmpty(annotations)) target.annotations = annotations;
	}

}

module.exports = Oas20RootConverter;
