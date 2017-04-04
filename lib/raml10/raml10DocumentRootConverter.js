const _ = require('lodash');
const Converter = require('../model/converter');
const MediaType = require('../model/mediaType');
const BaseUri = require('../model/baseUri');
const DocumentRoot = require('../model/documentRoot');
const Raml10InfoConverter = require('../raml10/Raml10InfoConverter');
const url = require('url');


class Raml10DocumentRootConverter extends Converter{

	export(model) {
		return _.isEmpty(model)? {} : this._export(model);
	}

	import(ramlDef) {
		return _.isEmpty(ramlDef)? {} : this._import(ramlDef);
	}

	_export(model) {
		const attrIdMap = {};
		const attrIdSkip = ['info', 'baseUri', 'baseUriParameters', 'mediaType', 'protocols'];
		const ramlDef = Raml10DocumentRootConverter.copyObjectFrom(model, attrIdMap, attrIdSkip);

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

		//TODO
		//if (model.hasOwnProperty('baseUriParameters')) ramlDef.baseUriParameters = convertParameters;

		if (model.hasOwnProperty('baseUri')) ramlDef.baseUri = model.baseUri.uri;

		return ramlDef;
	}

	_import(ramlDef) {
		const model = new DocumentRoot();

		const raml10InfoConverter = new Raml10InfoConverter();
		model.info =  raml10InfoConverter.import(ramlDef);

		if (ramlDef.hasOwnProperty('protocols')) model.protocols = ramlDef.protocols.map(function(protocol){ return protocol.toLowerCase() }) ;

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

		//TODO
		/*if (ramlDef.hasOwnProperty('baseUriParameters')) {
			model.parameters = convertParameters;
		}*/


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
		const result = new DocumentRoot();

		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;

			if (attrIdSkip.indexOf(id) < 0) {
				result[attrIdMap.hasOwnProperty(id) ? attrIdMap[id] : id] = object[id];
			}
		}

		return result;
	}
}

module.exports = Raml10DocumentRootConverter;