const _ = require('lodash');
const Converter = require('../model/converter');
const MediaType = require('../model/mediaType');
const BaseUri = require('../model/baseUri');
const Root = require('../model/root');
const Raml10InfoConverter = require('../raml10/Raml10InfoConverter');
const Raml10DefinitionConverter = require('../raml10/Raml10DefinitionConverter');
const Raml10ParameterConverter = require('../raml10/Raml10ParameterConverter');
const url = require('url');


class Raml10RootConverter extends Converter{

	export(model) {
		return _.isEmpty(model)? {} : this._export(model);
	}

	import(ramlDef) {
		return _.isEmpty(ramlDef)? {} : this._import(ramlDef);
	}

	_export(model) {
		const attrIdMap = {};
		const attrIdSkip = ['info', 'baseUri', 'baseUriParameters', 'mediaType', 'protocols','securityDefinitions','resources', 'types', 'resourceTypes'];
		const ramlDef = Raml10RootConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);

		if (model.hasOwnProperty('info')) {
			const raml10InfoConverter = new Raml10InfoConverter();
			_.merge(ramlDef, raml10InfoConverter.export(model.info));
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
				const raml10ParameterConverter = new Raml10ParameterConverter();
				ramlDef.baseUriParameters = raml10ParameterConverter.export(model.baseUriParameters);
			}
		}

		if (model.hasOwnProperty('baseUri')) ramlDef.baseUri = model.baseUri.uri;

		return ramlDef;
	}

	_import(ramlDef) {
		const model = new Root();

		const raml10InfoConverter = new Raml10InfoConverter();
		model.info =  raml10InfoConverter.import(ramlDef);

		if (ramlDef.hasOwnProperty('protocols')){
			if (_.isArray(ramlDef.protocols)){
				model.protocols = ramlDef.protocols.map(function(protocol){ return protocol.toLowerCase() }) ;
			} else {
				model.protocols = [ramlDef.protocols.toLowerCase()];
			}
		}

		if (ramlDef.hasOwnProperty('baseUri')) {
			const parsedUrl = url.parse(ramlDef.baseUri);
			const protocol = parsedUrl.protocol.slice(0,-1).toLowerCase();
			if (model.hasOwnProperty('protocols')){
				if (!_.includes(model.protocols,protocol)) model.protocols.push(protocol);
			} else {
				model.protocols = [protocol];
			}
			const baseUri = new BaseUri();
			baseUri.uri = parsedUrl.href;
			baseUri.host = parsedUrl.host;
			baseUri.basePath = parsedUrl.path;
			model.baseUri = baseUri;
		}

		if (ramlDef.hasOwnProperty('baseUriParameters')) {
			if (!_.isEmpty(ramlDef.baseUriParameters)) {
				const raml10ParameterConverter = new Raml10ParameterConverter();
				const baseUriParameters = [];
				for (const id in ramlDef.baseUriParameters) {
					if (!ramlDef.baseUriParameters.hasOwnProperty(id)) continue;
					baseUriParameters.push(raml10ParameterConverter._import(ramlDef.baseUriParameters[id]));
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
}

module.exports = Raml10RootConverter;