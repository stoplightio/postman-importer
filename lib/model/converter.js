const _ = require('lodash'),
	ramlParser = require('raml-1-parser'),
	oasParser = require('swagger-parser');

class Converter {

	constructor(model) {
		this.model = model;
	}
	
	loadFile(filePath, options) {
		return new Promise((resolve, reject) => {
			const parser = Converter.getParser(this.type.className);
			parser.loadApi(filePath, Converter._options(options)).then((api) => {
				try {
					this.data = api.expand(true).toJSON({ serializeMetadata: false });
					resolve();
				}
				catch (e) {
					reject(e);
				}
			}).catch(reject);
		});
	}
	
	static _options(options) {
		const validate = options && (options.validate === true || options.validateImport === true);
		const parseOptions = {
			attributeDefaults: false,
			rejectOnErrors: validate
		};
		return !options ? parseOptions : _.merge(parseOptions, options);
	}
	
	static getParser(className) {
		switch (className) {
			case 'RAML10':
				return ramlParser;
			case 'OAS20':
				return oasParser;
		}
	}
	
	export(models) {
		const result = {};
		Object.entries(models).map(([key, value]) => {
			result[key] = this._export(value);
		});

		return result;
	}

	static copyObjectFrom(object, attrIdMap, attrIdSkip) {
		const result = {};

		Object.entries(object).map(([key, value]) => {
			if (attrIdSkip.indexOf(key) < 0) {
				result[attrIdMap.hasOwnProperty(key) ? attrIdMap[key] : key] = value;
			}
		});

		return result;
	}

	import(specDefs) {
		const result = {};
		if (_.isEmpty(specDefs)) return result;

		Object.entries(specDefs).map(([key, value]) => {
			result[key] = this._import(value);
		});

		return result;
	}

	_export() {
		throw new Error('export method not implemented');
	}

	_import() {
		throw new Error('import method not implemented');
	}
}

module.exports = Converter;