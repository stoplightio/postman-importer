const _ = require('lodash');
const Converter = require('../model/converter');
const parser = require('swagger-parser');
const Oas20RootConverter = require('../oas20/Oas20RootConverter');
const Oas20SecurityDefinitionConverter = require('../oas20/Oas20SecurityDefinitionConverter');
const Oas20ResourceConverter = require('../oas20/Oas20ResourceConverter');
const Oas20DefinitionConverter = require('../oas20/Oas20DefinitionConverter');
const Oas20TraitConverter = require('../oas20/Oas20TraitConverter');

class Oas20Converter extends Converter {
	
	loadFile(dataOrPath, options) {
		return new Promise((resolve, reject) => {
			const validateOptions = _.cloneDeep(options || {});
			const validate = options && (options.validate === true || options.validateImport === true);
			validateOptions.validate = { schema: validate, spec: validate};
			
			const dataCopy = _.cloneDeep(dataOrPath);
			parser.validate(dataCopy, validateOptions)
				.then(() => {
					this._doParseData(dataOrPath, options || {}, resolve, reject);
				})
				.catch(reject);
		});
	}
	
	_doParseData(dataOrPath, options, resolve, reject) {
		// without validation
		parser.parse(dataOrPath, options)
			.then((api) => {
				JSON.parse(JSON.stringify(api));
				
				this.data = api;
				let parseFn;
				if (typeof dataOrPath === 'string') {
					parseFn = parser.dereference(dataOrPath, JSON.parse(JSON.stringify(api)), options);
				} else {
					parseFn = parser.dereference(JSON.parse(JSON.stringify(api)), options);
				}
				
				parseFn
					.then((dereferencedAPI) => {
						if (options && options.expand) {
							this.data = dereferencedAPI;
						} else {
							this.dereferencedAPI = dereferencedAPI;
						}
						resolve();
					})
					.catch(reject);
			})
			.catch(reject);
	}
	
	export(model) {
		return new Promise((resolve, reject) => {
			try {
				const rootConverter = new Oas20RootConverter();
				const oasDef = rootConverter.export(model);
				oasDef.swagger = "2.0";
				const securityDefinitionConverter = new Oas20SecurityDefinitionConverter();
				if (model.hasOwnProperty('securityDefinitions')) oasDef.securityDefinitions = securityDefinitionConverter.export(model.securityDefinitions);
				const definitionConverter = new Oas20DefinitionConverter();
				if (model.hasOwnProperty('types')) oasDef.definitions = definitionConverter.export(model.types);
				const traitConverter = new Oas20TraitConverter();
				if (model.hasOwnProperty('traits')) {
					const traitsDef = traitConverter.export(model.traits);
					if (!_.isEmpty(traitsDef.parameters)) oasDef.parameters = traitsDef.parameters;
					if (!_.isEmpty(traitsDef.responses)) oasDef.responses = traitsDef.responses;
				}
				const resourceConverter = new Oas20ResourceConverter(model);
				if (model.hasOwnProperty('resources')) {
					oasDef.paths = resourceConverter.export(model.resources);
				} else {
					oasDef.paths = {};
				}
				
				resolve(oasDef);
			} catch (err) {
				reject(err);
			}
		});
	}

	import(oasDef) {
		const rootConverter = new Oas20RootConverter();
		const model = rootConverter.import(oasDef);
		const securityDefinitionConverter = new Oas20SecurityDefinitionConverter();
		if (oasDef.hasOwnProperty('securityDefinitions') && !_.isEmpty(oasDef.securityDefinitions)) model.securityDefinitions = securityDefinitionConverter.import(oasDef.securityDefinitions);
		const definitionConverter = new Oas20DefinitionConverter();
		if (oasDef.hasOwnProperty('definitions')) model.types = definitionConverter.import(oasDef.definitions);
		const resourceConverter = new Oas20ResourceConverter(model);
		if (oasDef.hasOwnProperty('paths')) model.resources = resourceConverter.import(oasDef.paths);
		const traitConverter = new Oas20TraitConverter(model);
		if (oasDef.hasOwnProperty('parameters') || oasDef.hasOwnProperty('responses')) {
			model.traits = traitConverter.import({
				parameters: oasDef.parameters,
				responses: oasDef.responses
			});
		}

		return model;
	}
}

module.exports = Oas20Converter;