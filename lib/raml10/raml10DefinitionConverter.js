const _ = require('lodash');
const Definition = require('../model/definition');
const Converter = require('../model/converter');
const helper = require('../helpers/converter');
const jsonHelper = require('../utils/json');
const ramlHelper = require('../helpers/raml');
const stringHelper = require('../utils/strings');

class Raml10DefinitionConverter extends Converter {

	constructor(annotationPrefix) {
		super();
		this.annotationPrefix = annotationPrefix;
	}

	export(models) {
		const result = {};

		Object.entries(models).map(([key, value]) => {
			const newKey = stringHelper.checkAndReplaceInvalidChars(key, ramlHelper.getValidCharacters, ramlHelper.getReplacementCharacter);
			result[newKey] = this._export(value);
			if (key !== newKey) {
				result[newKey]['(' + this.annotationPrefix + '-definition-name)'] = key;
			}
		});

		return result;
	}

	_export(model) {
		const attrIdMap = {
			'_enum': 'enum',
			'_default': 'default'
		};

		const attrIdSkip = ['name', 'type', 'reference', 'properties', 'items', 'compositionType', 'in', 'schema', 'additionalProperties', 'title', 'items',
			'exclusiveMaximum', 'exclusiveMinimum', 'readOnly', 'externalDocs'];

		const ramlDef = Converter.copyObjectFrom(model, attrIdMap, attrIdSkip);

		if (model.hasOwnProperty('type')) {
			if (typeof model.type === 'object') {
				ramlDef.type = this._export(model.type); //todo check
			} else {
				ramlDef.type = model.type;
				if (model.hasOwnProperty('format')) {
					ramlDef['(' + this.annotationPrefix + '-format)'] = model.format;
					delete ramlDef.format;
				}
			}
		}

		if (ramlDef.hasOwnProperty('internalType')) {
			Raml10DefinitionConverter._convertFromInternalType(ramlDef);
		}

		if (ramlDef.hasOwnProperty('maximum') && ramlDef.hasOwnProperty('type') && scalarNumberTypes.indexOf(ramlDef.type) < 0) {
			ramlDef['(' + this.annotationPrefix + '-maximum)'] = ramlDef.maximum;
			delete ramlDef.maximum;
		}

		if (ramlDef.hasOwnProperty('minimum') && ramlDef.hasOwnProperty('type') && scalarNumberTypes.indexOf(ramlDef.type) < 0) {
			ramlDef['(' + this.annotationPrefix + '-minimum)'] = ramlDef.minimum;
			delete ramlDef.minimum;
		}

		if (model.hasOwnProperty('items')) {
			ramlDef.items = this._export(model.items);
		}

		if (model.hasOwnProperty('externalDocs')) {
			ramlDef['(' + this.annotationPrefix + '-externalDocs)'] = model.externalDocs;
		}

		if (model.hasOwnProperty('readOnly')) {
			ramlDef['(' + this.annotationPrefix + '-readOnly)'] = model.readOnly;
		}

		if (model.hasOwnProperty('title')) {
      ramlDef['(' + this.annotationPrefix + '-schema-title)'] = model.title;
		}

		if (model.hasOwnProperty('exclusiveMaximum')) {
			ramlDef['(' + this.annotationPrefix + '-exclusiveMaximum)'] = model.exclusiveMaximum;
		}

		if (model.hasOwnProperty('exclusiveMinimum')) {
			ramlDef['(' + this.annotationPrefix + '-exclusiveMinimum)'] = model.exclusiveMinimum;
		}

		if (model.hasOwnProperty('reference')) {
			const val = model.reference;
			if (_.isArray(val)) {
				ramlDef.type = val;
			} else {
				if (typeof val === 'object') {
					ramlDef.type = val;
				} else {
					ramlDef.type = val;
				}
			}
      ramlDef.type = stringHelper.checkAndReplaceInvalidChars(model.reference, ramlHelper.getValidCharacters, ramlHelper.getReplacementCharacter);
		}

		if (model.hasOwnProperty('properties')) {
			const ramlProps = {};
			Object.entries(model.properties).map(([key, value]) => {
		 		ramlProps[key] = this._export(value);

		 		if (!model.hasOwnProperty('propsRequired')) {
          ramlProps[key].required = false;
				} else if (model.hasOwnProperty('propsRequired') && _.isEmpty(model.propsRequired)) {
          ramlProps[key].required = false;
				} else if (model.hasOwnProperty('propsRequired') && !_.isEmpty(model.propsRequired) && model.propsRequired.indexOf(key) < 0) {
        	ramlProps[key].required = false;
				}
			})

			ramlDef.properties = ramlProps;
			delete ramlDef.propsRequired;
		}
		
		if (model.hasOwnProperty('items')) {
			ramlDef.items = this._export(model.items);
		}

		if (model.hasOwnProperty('compositionType')) {
			const result = {};
			Object.entries(model.compositionType).map(([key, value]) => {
				const val = this._export(value);
				if (val.hasOwnProperty('properties')) {
					delete val.type;
					_.merge(result, val);
				} else {
					if (result.hasOwnProperty('type') && val.hasOwnProperty('type')) {
						result.type = [result.type, val.type];
					} else {
						_.assign(result, val);
					}
				}
			})

			_.assign(ramlDef, result);
			delete ramlDef.compositionType;
		}
		
		if (model.hasOwnProperty('schema')) {
			ramlDef.schema = this._export(model.schema);
		}

		if (model.hasOwnProperty('additionalProperties')) {
			if (typeof model.additionalProperties === 'object') {
				if (!ramlDef.hasOwnProperty('properties')) {
					ramlDef.properties = {};
				}
				ramlDef.properties['//'] = this._export(model.additionalProperties);
				delete ramlDef.additionalProperties;
			} else {
				ramlDef.additionalProperties = model.additionalProperties;
			}
		}

		if (model.hasOwnProperty('example')) {
			if (model.hasOwnProperty('type') && scalarNumberTypes.indexOf(model.type) >= 0) {
				ramlDef['example'] = _.toNumber(model.example);
			} else {
				ramlDef['example'] = jsonHelper.parse(model.example);
			}
		}

		return ramlDef;
	}

	import(ramlDef) {
		const result = {};
		if (_.isEmpty(ramlDef)) return result;

		helper.removePropertiesFromObject(ramlDef, ['typePropertyKind', 'fixedFacets', 'structuredExample']);
		ramlDef.map(entry => {
			Object.entries(entry).map(([key, value]) => {
				result[key] = this._import(value);
			});
		})
		return result;
	}

	_import(ramlDef) {
		const attrIdMap = {
			'displayName': 'title',
			'enum': '_enum',
			'default': '_default'
		};

		const attrIdSkip = ['type', 'properties', 'items', 'schema', 'facets', 'structuredExample', 'fileTypes'];
		const model = Converter.copyObjectFrom(ramlDef, attrIdMap, attrIdSkip);

		if (ramlDef.hasOwnProperty('type')) {
			if (_.isArray(ramlDef.type) && !_.isEmpty(ramlDef.type)) {
				if (_.size(ramlDef.type) === 1) {
					this._convertSimpleType(ramlDef.type[0], model);
				}
				else if (_.size(ramlDef.type) > 1) {
					const compositionType = [];
					ramlDef.type.map(entry => {
						const model = {};
						this._convertSimpleType(entry, model);
						compositionType.push(model);
					});
					
					model.compositionType = compositionType;
				}
			} else {
				const val = ramlDef.type;
				if (typeof val === 'object') {
					model.type = this._import(val); //todo check
				}
			}
		} else {
			//default type is string
			if (!ramlDef.hasOwnProperty('properties'))
				model.type = 'string';
		}

		if (model.hasOwnProperty('type')) {
			Raml10DefinitionConverter._convertToInternalType(model);
		}

		if (ramlDef.hasOwnProperty('properties')) {
			const required = [];
			const modelProps = {};
			for (const id in ramlDef.properties) {
				if (!ramlDef.properties.hasOwnProperty(id)) continue;

				const value = ramlDef.properties[id];
				if (!value.hasOwnProperty('required') || (value.hasOwnProperty('required') && value.required === true))
					required.push(id);

				delete value.required;
				modelProps[id] = this._import(value);
			}
			model.properties = modelProps;
			if (!_.isEmpty(required)) {
				model.propsRequired = required;
			}
		}
		
		if (ramlDef.hasOwnProperty('items')) {
			if (typeof ramlDef.items === 'string'){
				model.items = { type: ramlDef.items };
			} else {
				model.items = this._import(ramlDef.items);
			}
		}
		
		if (ramlDef.hasOwnProperty('schema')) {
			model.schema = this._export(ramlDef.schema);
		}

		//composition type
		if (model.hasOwnProperty('reference') && model.hasOwnProperty('properties')) { //todo check
			const composition = [];
			composition.push(model.reference);
			const properties = {};
			properties.properties = model.properties;
			properties.propsRequired = model.propsRequired;
			composition.push(properties);

			delete model.reference;
			delete model.properties;
			delete model.propsRequired;

			model.compositionType = composition;
		}

		return model;
	}

	_convertSimpleType(entry, model) {
		const val = (entry.indexOf('|') < 0) ? entry : 'object';
		if (builtinTypes.indexOf(val) < 0)
			model.reference = val;
		else
			model.type = val;
	}

	static _convertToInternalType(model) {
		const hasFormat = model.hasOwnProperty('format');
		const type = model.type;
		const format = hasFormat ? model.format : null;

		if (type === 'integer' && !hasFormat) model.internalType = 'integer';
		if (type === 'number' && !hasFormat) model.internalType = 'number';
		if (type === 'integer' && format === 'int') model.internalType = 'int';
		if (type === 'integer' && format === 'int8') model.internalType = 'int8';
		if (type === 'integer' && format === 'int16') model.internalType = 'int16';
		if (type === 'integer' && format === 'int32') model.internalType = 'int32';
		if (type === 'integer' && format === 'int64') model.internalType = 'int64';
		if (type === 'number' && format === 'float') model.internalType = 'float';
		if (type === 'number' && format === 'double') model.internalType = 'double';
		if (type === 'number' && format === 'long') model.internalType = 'number';
		if (type === 'boolean') model.internalType = 'boolean';
		if (type === 'string' && !hasFormat) model.internalType = 'string';
		if (type === 'time-only') model.internalType = 'timeonly';
		if (type === 'datetime' && format === 'rfc3339') model.internalType = 'datetime';
		if (type === 'datetime' && format !== 'rfc3339') model.internalType = 'string';
		if (type === 'datetime-only') model.internalType = 'datetimeonly';
		if (type === 'date-only') model.internalType = 'dateonly';
		if (type === 'file') model.internalType = 'file';

		if (model.hasOwnProperty('internalType')) {
			delete model.type;
			delete model.format;
		}
	}

	static _convertFromInternalType(ramlDef) {
		if (!ramlDef.hasOwnProperty('internalType')) return;
		const internalType = ramlDef.internalType;

		if (internalType === 'integer') {
			ramlDef.type = 'integer';
		} else if (internalType === 'number') {
			ramlDef.type = 'number';
		} else if (internalType === 'int') {
			ramlDef.type = 'integer';
			ramlDef.format = 'int';
		} else if (internalType === 'int8') {
			ramlDef.type = 'integer';
			ramlDef.format = 'int8';
		} else if (internalType === 'int16') {
			ramlDef.type = 'integer';
			ramlDef.format = 'int16';
		} else if (internalType === 'int32') {
			ramlDef.type = 'integer';
			ramlDef.format = 'int32';
		} else if (internalType === 'int64') {
			ramlDef.type = 'integer';
			ramlDef.format = 'int64';
		} else if (internalType === 'float') {
			ramlDef.type = 'number';
			ramlDef.format = 'float';
		} else if (internalType === 'double') {
			ramlDef.type = 'number';
			ramlDef.format = 'double';
		} else if (internalType === 'boolean') {
			ramlDef.type = 'boolean';
		} else if (internalType === 'string') {
			ramlDef.type = 'string';
		} else if (internalType === 'byte') {
			ramlDef.type = 'string';
			ramlDef['(oas-format)'] = 'byte';
		} else if (internalType === 'binary') {
			ramlDef.type = 'string';
			ramlDef['(oas-format)'] = 'binary';
		} else if (internalType === 'password') {
			ramlDef.type = 'string';
			ramlDef['(oas-format)'] = 'password';
		} else if (internalType === 'file') {
			ramlDef.type = 'file';
		} else if (internalType === 'dateonly') {
			ramlDef.type = 'date-only';
		} else if (internalType === 'datetime') {
			ramlDef.type = 'datetime';
			ramlDef.format = 'rfc3339';
		} else if (internalType === 'timeonly') {
			ramlDef.type = 'time-only';
		} else if (internalType === 'datetimeonly') {
			ramlDef.type = 'datetime-only';
		}

		delete ramlDef.internalType;
	}
}

const scalarNumberTypes = ['number', 'integer'];
const scalarTypes = _.concat(scalarNumberTypes, ['string', 'boolean', 'datetime', 'date-only', 'file', 'time-only', 'datetime-only', 'nil', 'null']);
const integerValidFormats = ['int', 'int8', 'int16', 'int32', 'int64'];
const numberValidFormats = _.concat(integerValidFormats, ['long', 'float', 'double']);
const builtinTypes = _.concat(scalarTypes, ['any', 'array', 'object', 'union']);

module.exports = Raml10DefinitionConverter;