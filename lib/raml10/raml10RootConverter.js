const _ = require('lodash');
const Converter = require('../model/converter');
const MediaType = require('../model/mediaType');
const BaseUri = require('../model/baseUri');
const Root = require('../model/root');
const Tag = require('../model/tag');
const ExternalDocumentation = require('../model/externalDocumentation');
const Raml10InfoConverter = require('../raml10/Raml10InfoConverter');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');
const ParameterConverter = require('../common/ParameterConverter');
const Raml10AnnotationConverter = require('../raml10/Raml10AnnotationConverter');
const url = require('url');

class Raml10RootConverter extends Converter{

	export(model) {
		return _.isEmpty(model)? {} : this._export(model);
	}

	_export(model) {
		const attrIdMap = {};
		const attrIdSkip = ['info', 'baseUri', 'baseUriParameters', 'mediaType', 'protocols','securityDefinitions','resources', 'types', 'resourceTypes', 'annotations', 'tags', 'externalDocs', 'annotations'];
		const ramlDef = Raml10RootConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);

		if (model.hasOwnProperty('info')) {
			const infoConverter = new Raml10InfoConverter();
			_.merge(ramlDef, infoConverter.export(model.info));
		}

		if (model.hasOwnProperty('tags')) {
			const tags = model.tags;
			const tagsDef = [];
			tags.map( tag => {
				const result = {};
				if (tag.hasOwnProperty('name')) result.name = tag.name;
				if (tag.hasOwnProperty('description')) result.description = tag.description;
				if (tag.hasOwnProperty('externalDocs')) result.externalDocs= tag.externalDocs;
				if (!_.isEmpty(result)) {
					tagsDef.push(result);
				}
			});
			if (!_.isEmpty(tagsDef)) {
				ramlDef['(oas-tags-definition)'] = tagsDef;
			}
		}

		if (model.hasOwnProperty('externalDocs')) {
			ramlDef['(oas-externalDocs)'] = model.externalDocs;
		}

		if (model.hasOwnProperty('mediaType')) {
			if (model.mediaType.mimeTypes.length > 1) {
				ramlDef.mediaType = model.mediaType.mimeTypes;
			} else {
				ramlDef.mediaType = model.mediaType.mimeTypes[0];
			}
		}

		if (model.hasOwnProperty('protocols')) {
			ramlDef.protocols = model.protocols.map(function(protocol){ return protocol.toUpperCase() })
		}

		if (model.hasOwnProperty('baseUriParameters')) {
			if (_.isArray(model.baseUriParameters) && !_.isEmpty(model.baseUriParameters)) {
				const parameterConverter = new ParameterConverter();
				ramlDef.baseUriParameters = parameterConverter.export(model.baseUriParameters);
			}
		}

		if (model.hasOwnProperty('baseUri')) {
			if (model.baseUri.hasOwnProperty('annotations')) {
				const annotationConverter = new Raml10AnnotationConverter();
				ramlDef.baseUri = { value: model.baseUri.uri };
				_.assign(ramlDef.baseUri, annotationConverter._export(model.baseUri));
			} else
				ramlDef.baseUri = model.baseUri.uri;
		}
		
		Raml10RootConverter.exportAnnotations(model, ramlDef);

		return ramlDef;
	}
	
	static exportAnnotations(source, target) {
		if (source.hasOwnProperty('annotations') && _.isArray(source.annotations) && !_.isEmpty(source.annotations)) {
			const annotationConverter = new Raml10AnnotationConverter();
			_.assign(target, annotationConverter._export(source));
		}
	}

	import(ramlDef) {
		// helper.removePropertiesFromObject(ramlDef, ['typePropertyKind']);
		return _.isEmpty(ramlDef)? {} : this._import(ramlDef);
	}
	
	_import(ramlDef) {
		const model = new Root();

		const infoConverter = new Raml10InfoConverter();
		model.info =  infoConverter.import(ramlDef);

		if (ramlDef.hasOwnProperty('protocols')){
			if (_.isArray(ramlDef.protocols)){
				model.protocols = ramlDef.protocols.map(function(protocol){ return protocol.toLowerCase() }) ;
			} else {
				model.protocols = [ramlDef.protocols.toLowerCase()];
			}
		}

		if (ramlDef.hasOwnProperty('baseUri')) {
      const baseUri = new BaseUri();
      baseUri.uri = ramlDef.baseUri;
      const parsedURL = url.parse(ramlDef.baseUri);
      if (parsedURL.host) {
        const index = baseUri.uri.indexOf(parsedURL.host);
        if (baseUri.uri.charAt(index + parsedURL.host.length) !== '{') {
          baseUri.host = parsedURL.host;
        }
      }
      if (parsedURL.path && parsedURL.path !== '/') {
        const basePath = parsedURL.path.replace(/%7B/g, '{').replace(/%7D/g, '}');
        if (!basePath.startsWith('{')) {
          baseUri.basePath = basePath;
        }
      }
      if (parsedURL.protocol) {
        baseUri.protocol = parsedURL.protocol.slice(0, -1).toLowerCase();
        if (model.hasOwnProperty('protocols')) {
          if (!_.includes(model.protocols, baseUri.protocol)) {
            model.protocols.push(baseUri.protocol);
          }
        } else {
          model.protocols = [baseUri.protocol];
        }
      }
      model.baseUri = baseUri;
		}

		if (ramlDef.hasOwnProperty('baseUriParameters')) {
			if (!_.isEmpty(ramlDef.baseUriParameters)) {
				const parameterConverter = new ParameterConverter();
				const baseUriParameters = [];
				for (const id in ramlDef.baseUriParameters) {
					if (!ramlDef.baseUriParameters.hasOwnProperty(id)) continue;
					baseUriParameters.push(parameterConverter._import(ramlDef.baseUriParameters[id]));
				}
				model.baseUriParameters = baseUriParameters;
			}
		}


		if (ramlDef.hasOwnProperty('mediaType')) {
			const mediaType = new MediaType();
			mediaType.mimeTypes = _.isArray(ramlDef.mediaType)? ramlDef.mediaType : [ramlDef.mediaType];
			const mimes = [];
			for (const id in mediaType.mimeTypes) {
				if (!mediaType.mimeTypes.hasOwnProperty(id)) continue;
				if (!_.includes(mimes, mediaType.mimeTypes[id])) {
					mimes.push(mediaType.mimeTypes[id]);
				}
			}
			if (!_.isEmpty(mimes)){
				mediaType.consumes = mimes;
				mediaType.produces = mimes;
			}
			model.mediaType = mediaType;
		}

		if (ramlDef.hasOwnProperty('documentation')) model.documentation = ramlDef.documentation;
		
		if (ramlDef.hasOwnProperty('annotations') || ramlDef.hasOwnProperty('scalarsAnnotations')) {
			const annotationsDef = ramlDef.annotations;
			if (annotationsDef.hasOwnProperty('oas-tags-definition')) {
				const tagDef = annotationsDef['oas-tags-definition'];
				delete ramlDef.annotations['oas-tags-definition'];
				const tags = model.tags ? model.tags : [];
				if (tagDef.hasOwnProperty('structuredValue')) {
					const structuredValue = tagDef.structuredValue;
					structuredValue.map( value => {
						const tag = new Tag();
						tag.name = value.name;
						if (value.hasOwnProperty('description')) tag.description = value.description;
						if (value.hasOwnProperty('externalDocs')) {
							const externalDocs = value.externalDocs;
							const result = new ExternalDocumentation();
							if (externalDocs.hasOwnProperty('description')) result.description = externalDocs.description;
							if (externalDocs.hasOwnProperty('url')) result.url= externalDocs.url;
							if (!_.isEmpty(result)) {
								tag.externalDocs = result;
							}
						}
						if (!_.isEmpty(tag)) {
							tags.push(tag);
						}
					});
				}
				if (!_.isEmpty(tags)) {
					model.tags = tags;
				}
			}

			if (annotationsDef.hasOwnProperty('oas-externalDocs')) {
				const externalDocsDef = annotationsDef['oas-externalDocs'].structuredValue;
				delete ramlDef.annotations['oas-externalDocs'];
				const externalDocs = new ExternalDocumentation();
				if (externalDocsDef.hasOwnProperty('url')) externalDocs.url = externalDocsDef.url;
				if (externalDocsDef.hasOwnProperty('description')) externalDocs.description = externalDocsDef.description;
				if (!_.isEmpty(externalDocs)) model.externalDocs = externalDocs;
			}

			const annotationConverter = new Raml10AnnotationConverter(model);
			const annotations = annotationConverter._import(ramlDef);
			if (!_.isEmpty(annotations)) model.annotations = annotations;
		}

		return model;
	}

	static copyObjectFrom(object, attrIdMap, attrIdSkip) {
		const result = new Root();

		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;

			if (attrIdSkip.indexOf(id) < 0) {
				result[attrIdMap.hasOwnProperty(id) ? attrIdMap[id] : id] = object[id];
			}
		}

		return result;
	}
	
	static importAnnotations(source, target, model) {
		if ((source.hasOwnProperty('annotations') && !_.isEmpty(source.annotations))
				|| (source.hasOwnProperty('scalarsAnnotations') && !_.isEmpty(source.scalarsAnnotations))) {
			const annotationConverter = new Raml10AnnotationConverter(model);
			const annotations = annotationConverter._import(source);
			if (!_.isEmpty(annotations)) target.annotations = annotations;
			if (target.definition) delete target.definition.annotations;
		}
	}
	
}

module.exports = Raml10RootConverter;