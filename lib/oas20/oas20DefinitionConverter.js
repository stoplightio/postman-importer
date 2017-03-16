const Definition = require('../model/definition');
const Converter = require('../model/converter');
const fileHelper = require('../utils/file');

class Oas20DefinitionConverter extends Converter {

	_export(model) {
		const attrIdMap = {
			'_enum': 'enum',
			'_default': 'default'
		};

		const attrIdSkip = ['fileReference', 'reference', 'properties', 'compositionType'];

		const oasDef = Converter.copyObjectFrom(model, attrIdMap, attrIdSkip);

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

			oasDef.required = model.propsRequired;
			delete oasDef.propsRequired;
			oasDef.properties = oasProps;
		}

		if (model.hasOwnProperty('compositionType')) {
			const val = model.compositionType;
			const allOf = [];
			Object.values(model.compositionType).map(value => {
				allOf.push(this._export(value));
			});

			oasDef.allOf = allOf;
		}

		return oasDef;
	}

	_import(oasDef) {
		const attrIdMap = {
			'enum': '_enum',
			'default': '_default'
		};

		const attrIdSkip = ['$ref', 'properties', 'allOf'];

		const model = Converter.copyObjectFrom(oasDef, attrIdMap, attrIdSkip);

		if (oasDef.hasOwnProperty('$ref')) {
			const value = oasDef['$ref'];
			if (fileHelper.isFilePath(value)) {
				model.fileReference = value;
			} else {
				model.reference = value.replace('#/definitions/', '');
			}
		}

		if (oasDef.hasOwnProperty('properties')) {
			const modelProps = {};

			Object.entries(oasDef.properties).map(([key, value]) => {
				modelProps[key] = this._import(value);
			});

			model.properties = modelProps;
			model.propsRequired = model.required;
			delete model.required;
		}

		if (oasDef.hasOwnProperty('allOf')) {
			const composition = [];

			Object.values(oasDef['allOf']).map(val => {
				composition.push(this._import(val))
			})

			model.compositionType = composition;
		}

		return model;
	}

}

const primitiveDataTypes = ['integer', 'number', 'string', 'boolean', 'string', 'file'];

module.exports = Oas20DefinitionConverter;