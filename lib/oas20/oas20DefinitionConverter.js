const Definition = require('../model/definition');
const Converter = require('../model/converter');
const fileHelper = require('../utils/file');
const _ = require('lodash');
const jsonHelper = require('../utils/json');
const Oas20RootConverter = require('../oas20/Oas20RootConverter');
const Oas20AnnotationConverter = require('../oas20/Oas20AnnotationConverter');

class Oas20DefinitionConverter extends Converter {

	_export(model) {
		const attrIdMap = {
			'_enum': 'enum',
			'_default': 'default'
		};

		const attrIdSkip = ['name', 'fileReference', 'reference', 'properties', 'compositionType', 'schema', 'items', 'additionalProperties', 'jsonValue', 'schemaPath', 'examples', '$schema', 'id', 'annotations'];
		const oasDef = Converter.copyObjectFrom(model, attrIdMap, attrIdSkip);

		if (oasDef.hasOwnProperty('internalType')) {
			Oas20DefinitionConverter._convertFromInternalType(oasDef);
		}

		if (model.hasOwnProperty('example')) {
			// if (model.hasOwnProperty('type') && scalarNumberTypes.indexOf(model.type) >= 0) {
				// oasDef['example'] = _.toNumber(model.example);
			// } else {
				oasDef['example'] = jsonHelper.parse(jsonHelper.stringify(model.example));
			// }
		}

		if (model.hasOwnProperty('examples')) {
			if (_.isArray(model.examples) && !_.isEmpty(model.examples)) {
				oasDef['example'] = jsonHelper.parse(jsonHelper.stringify(model.examples[0]));
			}
		}

		if (model.hasOwnProperty('additionalProperties')) {
			if (typeof model.additionalProperties === 'object') {
				oasDef.additionalProperties = this._export(model.additionalProperties);
			} else {
				oasDef.additionalProperties = model.additionalProperties;
			}
		}

		if (model.hasOwnProperty('items')) {
			oasDef.items = this._export(model.items);
		}

		if (model.hasOwnProperty('fileReference')) {
			oasDef['$ref'] = model.fileReference;
		}

		if (model.hasOwnProperty('reference')) {
			oasDef['$ref'] = '#/definitions/' + model.reference;
		}

		if (model.hasOwnProperty('properties')) {
			const oasProps = {};
			Object.entries(model.properties).map(([key, value]) => {
				oasProps[key] = this._export(value);
			});

			if (!_.isEmpty(oasProps)) oasDef.properties = oasProps;
			if (!_.isEmpty(model.propsRequired)) {
				oasDef.required = model.propsRequired;
				delete oasDef.propsRequired;
			}
		}
		
		if (model.hasOwnProperty('items')) {
			oasDef.items = this._export(model.items);
		}

		if (model.hasOwnProperty('compositionType')) {
			const val = model.compositionType;
			const allOf = [];
			Object.values(model.compositionType).map(value => {
				allOf.push(this._export(value));
			});

			oasDef.allOf = allOf;
		}
		
		if (model.hasOwnProperty('schema')) {
			oasDef.schema = this._export(model.schema);
		}

		if (model.hasOwnProperty('annotations') && _.isArray(model.annotations) && !_.isEmpty(model.annotations)) {
			const annotationConverter = new Oas20AnnotationConverter();
			_.assign(oasDef, annotationConverter._export(model));
		}
		
		return oasDef;
	}

	_import(oasDef) {
		const attrIdMap = {
			'default': '_default'
		};

		const attrIdSkip = ['enum', '$ref', 'properties', 'allOf', 'schema', 'items', 'additionalProperties'];
		const model = Converter.copyObjectFrom(oasDef, attrIdMap, attrIdSkip);

		if (model.hasOwnProperty('type')) {
			Oas20DefinitionConverter._convertToInternalType(model);
		}

		if (oasDef.hasOwnProperty('enum') && oasDef.type !== 'boolean') {
			model._enum = oasDef.enum;
		}

		if (oasDef.hasOwnProperty('$ref')) {
			const value = oasDef['$ref'];
			if (fileHelper.isFilePath(value)) {
				model.fileReference = value;
			} else {
				model.reference = value.replace('#/definitions/', '');
			}
		}

		if (oasDef.hasOwnProperty('items')) {
			model.items = this._import(oasDef.items);
		}

		if (oasDef.hasOwnProperty('additionalProperties')) {
			model.additionalProperties = (typeof oasDef.additionalProperties === 'object') ? this._import(oasDef.additionalProperties) : oasDef.additionalProperties;
		}

		if (oasDef.hasOwnProperty('properties')) {
			const modelProps = {};

			Object.entries(oasDef.properties).map(([key, value]) => {
				modelProps[key] = this._import(value);
			});

			model.properties = modelProps;
			if (!_.isEmpty(model.required)) {
				model.propsRequired = model.required;
				delete model.required;
			}
		}

		if (oasDef.hasOwnProperty('allOf')) {
			const composition = [];

			Object.values(oasDef['allOf']).map(val => {
				composition.push(this._import(val))
			})

			model.compositionType = composition;
		}

		if (oasDef.hasOwnProperty('schema')) {
			model.schema = this._import(oasDef.schema);
		}

		const annotationConverter = new Oas20AnnotationConverter(this.model);
		const annotations = annotationConverter._import(oasDef);
		if (!_.isEmpty(annotations)) model.annotations = annotations;
		
		return model;
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
		if (type === 'boolean') model.internalType = 'boolean';
		if (type === 'string' && !hasFormat) model.internalType = 'string';
		if (type === 'string' && format === 'byte') model.internalType = 'byte';
		if (type === 'string' && format === 'binary') model.internalType = 'binary';
		if (type === 'string' && format === 'password') model.internalType = 'password';
		if (type === 'string' && format === 'date') model.internalType = 'dateonly';
		if (type === 'string' && format === 'date-time') model.internalType = 'datetime';

		if (model.hasOwnProperty('internalType')) {
			delete model.type;
			delete model.format;
		}
	}

	static _convertFromInternalType(oasDef) {
		if (!oasDef.hasOwnProperty('internalType')) return;
		const internalType = oasDef.internalType;

		if (internalType === 'integer') {
			oasDef.type = 'integer';
		} else if (internalType === 'number') {
			oasDef.type = 'number';
		} else if (internalType === 'int') {
			oasDef.type = 'integer';
			oasDef.format = 'int';
		} else if (internalType === 'int8') {
			oasDef.type = 'integer';
			oasDef.format = 'int8';
		} else if (internalType === 'int16') {
			oasDef.type = 'integer';
			oasDef.format = 'int16';
		} else if (internalType === 'int32') {
			oasDef.type = 'integer';
			oasDef.format = 'int32';
		} else if (internalType === 'int64') {
			oasDef.type = 'integer';
			oasDef.format = 'int64';
		} else if (internalType === 'float') {
			oasDef.type = 'number';
			oasDef.format = 'float';
		} else if (internalType === 'double') {
			oasDef.type = 'number';
			oasDef.format = 'double';
		} else if (internalType === 'boolean') {
			oasDef.type = 'boolean';
		} else if (internalType === 'string') {
			oasDef.type = 'string';
		} else if (internalType === 'byte') {
			oasDef.type = 'string';
			oasDef.format = 'byte';
		} else if (internalType === 'binary') {
			oasDef.type = 'string';
			oasDef.format = 'binary';
		} else if (internalType === 'password') {
			oasDef.type = 'string';
			oasDef.format = 'password';
		} else if (internalType === 'file') {
			oasDef.type = 'string';
		} else if (internalType === 'dateonly') {
			oasDef.type = 'string';
			oasDef.format = 'date';
		} else if (internalType === 'datetime') {
			oasDef.type = 'string';
			oasDef.format = 'date-time';
		} else if (internalType === 'timeonly') {
			oasDef.type = 'string';
		} else if (internalType === 'datetimeonly') {
			oasDef.type = 'string';
		}

		delete oasDef.internalType;
	}
}

module.exports = Oas20DefinitionConverter;