const _ = require('lodash');
const Definition = require('../model/definition');
const Converter = require('../model/converter');
const helper = require('../helpers/converter');

class Raml10DefinitionConverter extends Converter {

	_export(model) {
		const attrIdMap = {
			'title': 'displayName',
			'_enum': 'enum',
			'_default': 'default'
		};

		const attrIdSkip = ['name', 'type', 'reference', 'properties', 'items', 'compositionType', 'in', 'schema'];
		const ramlDef = Converter.copyObjectFrom(model, attrIdMap, attrIdSkip);

		if (model.hasOwnProperty('type')) {
			if (typeof model.type === 'object') {
				ramlDef.type = this._export(model.type);
			} else {
				ramlDef.type = model.type;
			}
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
		}

		if (model.hasOwnProperty('properties')) {
			const ramlProps = {};
			Object.entries(model.properties).map(([key, value]) => {
				ramlProps[key] = this._export(value);
				if (model.hasOwnProperty('propsRequired') && !_.isEmpty(model.propsRequired) && model.propsRequired.indexOf(key) < 0)
					ramlProps[key].required = false;
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
					result.properties = val.properties;
				} else {
					_.assign(result, val);
				}
			})

			_.assign(ramlDef, result);
			delete ramlDef.compositionType;
		}
		
		if (model.hasOwnProperty('schema')) {
			ramlDef.schema = this._export(model.schema);
		}

		return ramlDef;
	}

	import(ramlDef) {
		const result = {};
		if (_.isEmpty(ramlDef)) return result;

		helper.removePropertiesFromObject(ramlDef, ['typePropertyKind']);
		ramlDef.map(entry => {
			_.assign(result, super.import(entry));
		})
		return result;
	}

	_import(ramlDef) {
		const attrIdMap = {
			'displayName': 'title',
			'enum': '_enum',
			'default': '_default'
		};

		const attrIdSkip = ['type', 'properties', 'items', 'schema'];
		const model = Converter.copyObjectFrom(ramlDef, attrIdMap, attrIdSkip);

		if (ramlDef.hasOwnProperty('type')) {
			if (_.isArray(ramlDef.type) && !_.isEmpty(ramlDef.type)) {
				if (_.size(ramlDef.type) == 1) {
					const val = ramlDef.type[0];
					if (builtinTypes.indexOf(val) < 0)
						model.reference = val;
					else
						model.type = val;
				}
				else if (_.size(ramlDef.type) > 1) {
					model.compositionType = ramlDef.type;
				}
			} else {
				const val = ramlDef.type;
				if (typeof val === 'object') {
					model.type = this._import(val);
				}
			}
		}

		if (ramlDef.hasOwnProperty('properties')) {
			const required = [];
			const modelProps = {};
			for (const id in ramlDef.properties) {
				if (!ramlDef.properties.hasOwnProperty(id)) continue;

				const value = ramlDef.properties[id];
				if (!value.hasOwnProperty('required') || (value.hasOwnProperty('required') && value.required === true))
					required.push(id);

				modelProps[id] = this._import(value);
			}
			model.properties = modelProps;
			model.propsRequired = required;
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
		if (model.hasOwnProperty('reference') && model.hasOwnProperty('properties')) {
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
}

const scalarTypes = ['string', 'number', 'integer', 'boolean', 'datetime', 'date-only', 'file', 'time-only', 'datetime-only', 'nil', 'null'];
const builtinTypes = _.concat(scalarTypes, ['any', 'array', 'object', 'union']);

module.exports = Raml10DefinitionConverter;