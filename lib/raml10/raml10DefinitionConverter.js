const _ = require('lodash');
const Definition = require('../model/definition');
const Converter = require('../model/converter');
const helper = require('../helpers/converter');
const jsonHelper = require('../utils/json');
const arrayHelper = require('../utils/array');
const ramlHelper = require('../helpers/raml');
const stringHelper = require('../utils/strings');
const xmlHelper = require('../utils/xml');
const Raml10RootConverter = require('../raml10/Raml10RootConverter');
const Raml10AnnotationConverter = require('../raml10/Raml10AnnotationConverter');
const Raml10CustomAnnotationConverter = require('../raml10/Raml10CustomAnnotationConverter');


class Raml10DefinitionConverter extends Converter {

	constructor(model, annotationPrefix, ramlDef) {
		super(model);
		this.annotationPrefix = annotationPrefix;
		this.ramlDef = ramlDef;
	}

	export(models) {
		const result = {};

		Object.entries(models).map(([key, value]) => {
			const newKey = stringHelper.checkAndReplaceInvalidChars(key, ramlHelper.getValidCharacters, ramlHelper.getReplacementCharacter);
			result[newKey] = this._export(value);
			if (key !== newKey) {
				const id = this.annotationPrefix + '-definition-name';
				Raml10CustomAnnotationConverter._createAnnotationType(this.ramlDef, this.annotationPrefix, id);
				result[newKey]['(' + id + ')'] = key;
			}
		});

		return result;
	}

	_export(model) {

		if (model.hasOwnProperty('jsonValue')) {
			return model.jsonValue;
		}

		const attrIdMap = {
			'_enum': 'enum',
			'_default': 'default'
		};

		const attrIdSkip = ['name', 'type', 'reference', 'properties', 'items', 'compositionType', 'in', 'schema', 'additionalProperties', 'title', 'items',
			'exclusiveMaximum', 'exclusiveMinimum', 'readOnly', 'externalDocs', '$schema', 'annotations', 'collectionFormat', 'allowEmptyValue', 'fileReference'];

		const ramlDef = Converter.copyObjectFrom(model, attrIdMap, attrIdSkip);

		if (model.hasOwnProperty('type')) {
			if (typeof model.type === 'object') {
				ramlDef.type = this._export(model.type); //todo check
			} else {
				ramlDef.type = model.type;
				if (model.hasOwnProperty('format')) {
					const id = this.annotationPrefix + '-format';
					Raml10CustomAnnotationConverter._createAnnotationType(this.ramlDef, this.annotationPrefix, id);
					ramlDef['(' + id + ')'] = model.format;
					delete ramlDef.format;
				}
			}
		}

		if (model.hasOwnProperty('fileReference')) {
			ramlDef.type = '!include ' + model.fileReference.replace('#/', '#');
		}

		if (ramlDef.hasOwnProperty('internalType')) {
			this._convertFromInternalType(ramlDef);
		}

		if (model.hasOwnProperty('items')) {
			ramlDef.items = this._export(model.items);
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

			if (!_.isEmpty(ramlProps)) ramlDef.properties = ramlProps;
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
						delete val.type;
            _.merge(result, val);
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

		if (model.hasOwnProperty('exclusiveMaximum')) {
			const id = this.annotationPrefix + '-exclusiveMaximum';
			Raml10CustomAnnotationConverter._createAnnotationType(this.ramlDef, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.exclusiveMaximum;
		}
		if (model.hasOwnProperty('exclusiveMinimum')) {
			const id = this.annotationPrefix + '-exclusiveMinimum';
			Raml10CustomAnnotationConverter._createAnnotationType(this.ramlDef, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.exclusiveMinimum;
		}
		if (model.hasOwnProperty('title')) {
			const id = this.annotationPrefix + '-schema-title';
			Raml10CustomAnnotationConverter._createAnnotationType(this.ramlDef, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.title;
		}
		if (model.hasOwnProperty('readOnly')) {
			const id = this.annotationPrefix + '-readOnly';
			Raml10CustomAnnotationConverter._createAnnotationType(this.ramlDef, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.readOnly;
		}
		if (model.hasOwnProperty('collectionFormat')) {
			const id = this.annotationPrefix + '-collectionFormat';
			Raml10CustomAnnotationConverter._createAnnotationType(this.ramlDef, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.collectionFormat;
		}
		if (model.hasOwnProperty('allowEmptyValue')) {
			const id = this.annotationPrefix + '-allowEmptyValue';
			Raml10CustomAnnotationConverter._createAnnotationType(this.ramlDef, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.allowEmptyValue;
		}
		if (model.hasOwnProperty('externalDocs')) {
			const id = this.annotationPrefix + '-externalDocs';
			Raml10CustomAnnotationConverter._createAnnotationType(this.ramlDef, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.externalDocs;
		}
		if (ramlDef.hasOwnProperty('maximum') && ramlDef.hasOwnProperty('type') && scalarNumberTypes.indexOf(ramlDef.type) < 0) {
			const id = this.annotationPrefix + '-maximum';
			Raml10CustomAnnotationConverter._createAnnotationType(this.ramlDef, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = ramlDef.maximum;
			delete ramlDef.maximum;
		}
		if (ramlDef.hasOwnProperty('minimum') && ramlDef.hasOwnProperty('type') && scalarNumberTypes.indexOf(ramlDef.type) < 0) {
			const id = this.annotationPrefix + '-minimum';
			Raml10CustomAnnotationConverter._createAnnotationType(this.ramlDef, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = ramlDef.minimum;
			delete ramlDef.minimum;
		}
		if (model.hasOwnProperty('annotations') && _.isArray(model.annotations) && !_.isEmpty(model.annotations)) {
			const annotationConverter = new Raml10AnnotationConverter(this.model, this.annotationPrefix, this.ramlDef);
			_.assign(ramlDef, annotationConverter._export(model));
		}
		
		return ramlDef;
	}

	static _convertMapToArray(map) {
		const result = [];
		for (const id in map) {
			if (!map.hasOwnProperty(id)) continue;
			const value = {};
			value[id] = map[id];
			result.push(value);
		}
		return result;
	}

	import(ramlDef) {
		const result = {};
		if (_.isEmpty(ramlDef)) return result;
		if (ramlHelper.isRaml08Version(this.version)) return this.importRAML08(ramlDef);

		helper.removePropertiesFromObject(ramlDef, ['fixedFacets']);

		for (const index in ramlDef) {
			if (!ramlDef.hasOwnProperty(index)) continue;
			const entry = ramlDef[index];

			for (const key in entry) {
				if (!entry.hasOwnProperty(key)) continue;
				const value = entry[key];
				if (value.hasOwnProperty('typePropertyKind') && value.typePropertyKind === 'JSON') {
					const jsonValue = Raml10DefinitionConverter._readTypeAttribute(value.type);
					const parse = jsonHelper.parse(jsonValue);
					if (parse.hasOwnProperty('definitions')) {
						_.assign(result, (this.import(Raml10DefinitionConverter._convertMapToArray(parse.definitions))));
						delete parse.definitions;
						value.type[0] = jsonHelper.stringify(parse);
					}
					result[key] = this._import(parse);
					result[key].jsonValue = jsonValue;
				} else {
					result[key] = this._import(value);
				}
			}
		}

		return result;
	}
	
	importRAML08(ramlDef) {
		const result = {};
		if (_.isEmpty(ramlDef)) return result;
		
		if (_.isArray(ramlDef) && !_.isEmpty(ramlDef)) {
			for (const id in ramlDef) {
				if (!ramlDef.hasOwnProperty(id)) continue;
				
				const value = ramlDef[id];
				const name = _.keys(value)[0];
				const schema = JSON.parse(value[name]);
				result[name] = this._import(schema);
			}
		}
		
		return result;
	}

	_import(ramlDef) {
		const attrIdMap = {
			'displayName': 'title',
			'default': '_default'
		};

		Raml10DefinitionConverter._convertAnnotations(ramlDef);

		const attrIdSkip = ['enum', 'type', 'properties', 'items', 'schema', 'facets', 'structuredExample', 'fileTypes', 'typePropertyKind', 'strict', 'structureValue', 'examples', 'description', 'example'];
		const jsonType = ramlDef.hasOwnProperty('typePropertyKind') ? ramlDef.typePropertyKind === 'JSON' : false;
		const inplaceType = ramlDef.hasOwnProperty('typePropertyKind') ? ramlDef.typePropertyKind === 'INPLACE' : false;

		if (inplaceType) {
			let value;
			if (ramlDef.hasOwnProperty('type')) {
				value = Raml10DefinitionConverter._readTypeAttribute(ramlDef.type);
				_.assign(ramlDef, jsonHelper.parse(value));
				delete ramlDef.type;
			} else if (ramlDef.hasOwnProperty('schema')) {
				value = Raml10DefinitionConverter._readTypeAttribute(ramlDef.schema);
				_.assign(ramlDef, jsonHelper.parse(value));
				delete ramlDef.schema;
			}
		}

		const model = Converter.copyObjectFrom(ramlDef, attrIdMap, attrIdSkip);

		if (jsonType) {
			model.jsonValue = Raml10DefinitionConverter._readTypeAttribute(ramlDef.type);
		} else {
			if (ramlDef.hasOwnProperty('schemaPath')) {
				if (ramlDef.name.endsWith('/json')) {
					const value = JSON.parse(ramlDef.type);
					_.assign(model, this._import(value));
				}
				else model.type = 'object';
			} else if (ramlDef.hasOwnProperty('type')) {
				if (ramlHelper.isRaml08Version(this.version)) {
					if (_.isArray(ramlDef.type) && _.isEmpty(ramlDef.type)) {
						ramlDef.type = 'array';
						ramlDef.items = { type: 'string' };
					}
				}
				const value = Raml10DefinitionConverter._readTypeAttribute(ramlDef.type);
				if (_.isArray(value)) {
					const compositionType = [];
					value.map(entry => {
						const model = {};
						this._convertSimpleType(entry, model);
						compositionType.push(model);
					});
					if (arrayHelper.allEqual(compositionType)) {
						_.merge(model, compositionType[0]);
					} else {
						model.compositionType = compositionType;
					}
				} else {
					if (typeof value === 'object') {
						model.type = this._import(value); //todo check
					} else {
						this._convertSimpleType(value, model);
					}
				}
			} else {
				//default type is string
				if (!ramlDef.hasOwnProperty('properties'))
					model.type = 'string';
			}

			Raml10DefinitionConverter._convertToInternalType(model);
		}

		if (ramlDef.hasOwnProperty('properties')) {
			const required = ramlDef.hasOwnProperty('required') && _.isArray(ramlDef.required) ? ramlDef.required : [];
			const ignoreRequired = !_.isEmpty(required);

			const modelProps = {};
			for (const id in ramlDef.properties) {
				if (!ramlDef.properties.hasOwnProperty(id)) continue;

				const value = ramlDef.properties[id];
				if (id.startsWith('/') && id.endsWith('/')) { //additionalProperties
					model.additionalProperties = this._import(value);
				} else {
					if (!ignoreRequired && !value.hasOwnProperty('required') || (value.hasOwnProperty('required') && value.required === true))
						required.push(id);

					delete value.required;
					modelProps[id] = this._import(value);
				}
			}
			model.properties = modelProps;
			if (!_.isEmpty(required)) {
				model.propsRequired = required;
			}
		}
		
		if (ramlDef.hasOwnProperty('items')) {
			// if (typeof ramlDef.items === 'string'){
			// 	ramlDef.items = { type: [ ramlDef.items ] };
			const items = Raml10DefinitionConverter._readTypeAttribute(ramlDef.items);
			if (typeof items === 'string') {
				model.items = {};
				if (items.endsWith('[]')) {
					model.items = {
						type: 'array',
						items: {}
					}
					this._convertSimpleType(items.replace('[]', ''), model.items.items);
					Raml10DefinitionConverter._convertToInternalType(model.items.items);
				} else {
					this._convertSimpleType(items, model.items);
					Raml10DefinitionConverter._convertToInternalType(model.items);
				}
			} else if (ramlHelper.isRaml08Version(this.version) && _.isArray(items) && _.isEmpty(items)) {
				model.type = 'array';
				model.items = { type: 'string' };
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
			composition.push({
				reference: model.reference
			});
			const properties = {};
			properties.properties = model.properties;
			properties.propsRequired = model.propsRequired;
			composition.push(properties);

			delete model.reference;
			delete model.properties;
			delete model.propsRequired;

			model.compositionType = composition;
		}

		if (ramlDef.hasOwnProperty('description') && !_.isEmpty(ramlDef.description)) {
			model.description = ramlDef.description;
		}

		if (ramlDef.hasOwnProperty('examples')) {
			model.examples = ramlDef.examples.map(entry => {
				const result = jsonHelper.parse(entry.value);
				if (entry.hasOwnProperty('strict') && !entry.strict) {
					result.strict = entry.strict;
				}
				return result;
			})
		}

		if (ramlDef.hasOwnProperty('example')) {
			model.example = ramlDef.example;
			if (ramlDef.hasOwnProperty('structuredExample') && ramlDef.structuredExample.hasOwnProperty('strict') && !ramlDef.structuredExample.strict) {
				model.example.strict = ramlDef.structuredExample.strict;
			}
		}

		if (ramlDef.hasOwnProperty('enum') && ramlDef.type !== 'boolean') {
			model._enum = ramlDef.enum;
		}

		return model;
	}

	_convertSimpleType(entry, model) {
		// const val = (entry.indexOf('|') >= 0) ? 'object' : (_.endsWith(entry, '?') ? entry.substring(0, entry.length - 1) : entry);
		// if (raml10BuiltinTypes.indexOf(val) < 0)
		// 	model.reference = val;
		// else
		// 	model.type = val;
		let val = (entry.indexOf('|') < 0) ? entry.replace('(', '').replace(')', '') : 'object';
		val = val.endsWith('?') || xmlHelper.isXml(val) ? 'object' : val;
		if (val.endsWith('[]')) {
			val = val.replace('[]', '');
			_.assign(model,
				{
					type: 'array',
					items: {}
				})

			this._convertSimpleType(val, model.items);
		} else {
			const isRaml08Version = ramlHelper.isRaml08Version(this.version);
			const builtinTypes = isRaml08Version ? raml08BuiltinTypes : raml10BuiltinTypes;
			if (builtinTypes.indexOf(val) < 0) {
				if (isRaml08Version && !this.ramlDef.schemas.map(schema => { return _.keys(schema)[0] }).includes(val))
					model.type = 'string';
				else model.reference = val;
			}
			else model.type = val;
		}
	}

	static _readTypeAttribute(value) {
		if (_.isArray(value) && !_.isEmpty(value) && _.size(value) === 1)
			return value[0];

		return value;
	}

	static _convertAnnotations(ramlDef) {
		const annotationConverter = new Raml10AnnotationConverter();
		const annotations = annotationConverter._import(ramlDef);
		if (!_.isEmpty(annotations)) ramlDef.annotations = annotations;
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
		if (type === 'date') model.internalType = 'datetime';
		if (type === 'time-only') model.internalType = 'timeonly';
		if (type === 'datetime' && format === 'rfc3339') model.internalType = 'datetime';
		if (type === 'datetime' && format !== 'rfc3339') model.internalType = 'string';
		if (type === 'datetime-only') model.internalType = 'datetimeonly';
		if (type === 'date-only') model.internalType = 'dateonly';
		if (type === 'file') model.internalType = 'file';
		if (type === 'null') model.internalType = 'null';
		if (type === 'timestamp') model.internalType = 'timestamp';

		if (model.hasOwnProperty('internalType')) {
			delete model.type;
			delete model.format;
		}
	}

	_convertFromInternalType(ramlDef) {
		if (!ramlDef.hasOwnProperty('internalType')) return;
		const internalType = ramlDef.internalType;

		if (internalType === 'integer') {
			ramlDef.type = 'integer';
		} else if (internalType === 'number') {
			ramlDef.type = 'number';
		} else if (internalType === 'null') {
			ramlDef.type = 'null';
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
			const id = this.annotationPrefix + '-format';
			Raml10CustomAnnotationConverter._createAnnotationType(this.ramlDef, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = 'byte';
		} else if (internalType === 'binary') {
			ramlDef.type = 'string';
			const id = this.annotationPrefix + '-format';
      Raml10CustomAnnotationConverter._createAnnotationType(this.ramlDef, this.annotationPrefix, id);
      ramlDef['(' + id + ')'] = 'binary';
		} else if (internalType === 'password') {
			ramlDef.type = 'string';
			const id = this.annotationPrefix + '-format';
			Raml10CustomAnnotationConverter._createAnnotationType(this.ramlDef, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = 'password';
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
		} else if (internalType === 'timestamp') {
			ramlDef.type = 'timestamp';
		}

		delete ramlDef.internalType;
	}
}

const scalarNumberTypes = ['number', 'integer'];
const scalarTypes = _.concat(scalarNumberTypes, ['string', 'boolean', 'datetime', 'date-only', 'file', 'time-only', 'datetime-only', 'nil', 'null', 'timestamp']);
const integerValidFormats = ['int', 'int8', 'int16', 'int32', 'int64'];
const numberValidFormats = _.concat(integerValidFormats, ['long', 'float', 'double']);
const raml10BuiltinTypes = _.concat(scalarTypes, ['any', 'array', 'object', 'union']);
const raml08BuiltinTypes = _.concat(raml10BuiltinTypes, ['date']);

module.exports = Raml10DefinitionConverter;