// @flow
const _ = require('lodash');

const ConverterModel = require('oas-raml-converter-model');
const Converter = require('../converters/converter');
const BaseUri = ConverterModel.BaseUri;
const Root = ConverterModel.Root;
const Tag = ConverterModel.Tag;

const Oas30InfoConverter = require('./oas30InfoConverter');
const Oas30AnnotationConverter = require('./oas30AnnotationConverter');

const { ExternalDocumentation, Model, Server, ServerVariable } = require('./oas30Types');
const OasTag = require('./oas30Types').Tag;
const OasInfo = require('./oas30Types').Info;

class Oas30RootConverter extends Converter {
	export(model: Root): Model {
		if (_.isEmpty(model)) return new Model();

		const oasDef: Model = new Model(
			model.info != null
				? new Oas30InfoConverter().export(model.info)
				: new OasInfo()
		);

		if (model.externalDocs != null) {
			const externalDocs = new ExternalDocumentation(model.externalDocs.url || '');
			externalDocs.description = model.externalDocs.description;

			oasDef.externalDocs = externalDocs;

			Oas30RootConverter.exportAnnotations(model.externalDocs, oasDef);
		}

		if (model.baseUri != null) {
			const baseUri: BaseUri = model.baseUri;
			const { host, basePath, protocol } = baseUri;
			const servers: Server[] = [];
			const variables = {};

			if (model.baseUriParameters != null) {
				const params = model.baseUriParameters;

				for (const param of params) {
					const var_ = new ServerVariable(param.name);
					var_.description = param.description;
					if (param.definition != null && param.definition._enum != null) {
						var_.enum = param.definition._enum;
					}

					variables[param.name] = var_;
				}
			}

			if (host != null) {
				const protocols = model.protocols ||['http'];
				if (protocol != null && !protocols.includes(protocol)) {
					protocols.push(protocol);
				}

				for (let i = 0; i < protocols.length; i++) {
					const protocol: string = protocols[i];
					const url: string = protocol + '://' + host + (basePath || '/');
					const server = new Server(url);
					if(!_.isEmpty(variables)) {
						server.variables = variables;
					}
					servers.push(server);
				}
			}

			oasDef.servers = servers;

			Oas30RootConverter.exportAnnotations(baseUri, oasDef);
		}

		if (model.tags != null) {
			const tags: Tag[] = model.tags;
			oasDef.tags = [];
			for (let i = 0; i < tags.length; i++) {
				const tag: Tag = tags[i];
				const result: OasTag = new OasTag(tag.name);
				result.description = tag.description;

				if (tag.externalDocs != null) {
					const externalDocs: ExternalDocumentation = new ExternalDocumentation(tag.externalDocs.url || '');
					externalDocs.description = tag.externalDocs.description;
					result.externalDocs = externalDocs;
				}
				if (!_.isEmpty(result) && oasDef.tags != null) {
					oasDef.tags.push(result);
				}
			}
		}

		Oas30RootConverter.exportAnnotations(model, oasDef);

		return oasDef;
	}

	static exportAnnotations(source: any, target: any) {
		if (source.annotations != null && _.isArray(source.annotations) && !_.isEmpty(source.annotations)) {
			const annotationConverter = new Oas30AnnotationConverter();
			_.assign(target, annotationConverter._export(source));
		}
	}
}

module.exports = Oas30RootConverter;
