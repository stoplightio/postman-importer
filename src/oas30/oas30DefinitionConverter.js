// @flow
const _ = require('lodash');

const Converter = require('../model/converter');
const Definition = require('../model/definition');
const jsonHelper = require('../utils/json');
const stringHelper = require('../utils/strings');

const Oas30AnnotationConverter = require('./oas30AnnotationConverter');

import type { Schema } from './oas30Types';

class Oas30DefinitionConverter extends Converter {

	export(models: any) {
		const result = {};

		// for (let i = 0; i < models.length; i++) {
		// 	const model: Definition = models[i];
		// 	const modelName: string = model.name;
		// 	this.level = 'type';
		// 	if (!_.isEmpty(model) && model.hasOwnProperty('annotations') && model.annotations != null) {
		// 		const annotations: Annotation[] = model.annotations;
		// 		const definitionNameAnnotation: Annotation[] = annotations.filter( function(annotation) { return annotation.name === 'oas-definition-name'; });
		// 		if (!_.isEmpty(definitionNameAnnotation)) {
		// 			const annotation: Annotation = definitionNameAnnotation[0];
		// 			const name: any = annotation.definition;
		// 			result[name] = this._export(model);
		// 		} else {
		// 			result[modelName] = this._export(model);
		// 		}
		// 	} else {
		// 		result[modelName] = this._export(model);
		// 	}
		// }

		models.forEach((value) => {
			const key = stringHelper.sanitise(value.name);
			this.level = 'type';
			result[key] = this._export(value);
		});

		return result;
	}

	_export(model: Definition): Schema {
		const attrIdMap = {
			'_enum': 'enum',
			'_default': 'default',
			'displayName': 'title'
		};

		const attrIdSkip = [
			'name',
			'fileReference',
			'reference',
			'properties',
			'compositionType',
			'schema',
			'items',
			'itemsList',
			'additionalProperties',
			'jsonValue',
			'schemaPath',
			'examples',
			'$schema',
			'id',
			'annotations',
			'fileTypes',
			'propsRequired'
		];

		const oasDef: Schema = Oas30DefinitionConverter.createOasDef(model, attrIdMap, attrIdSkip);

		if (oasDef.internalType != null) {
			Oas30DefinitionConverter._convertFromInternalType(oasDef, this.level);
		}

		if (model.example != null) {
			const example = jsonHelper.parse(jsonHelper.stringify(model.example));

			if (typeof example === 'object' && !_.isArray(example) && example != null) {
				oasDef.example = Oas30DefinitionConverter.exportExample(example);
			} else {
				oasDef.example = example;
			}

			if (typeof oasDef.example === 'number' && typeof model.example === 'string') {
				oasDef.example = jsonHelper.stringify(model.example);
			}
			if (Array.isArray(oasDef.example)) {
				oasDef.example.map(e => {
					Oas30DefinitionConverter.escapeExampleAttributes(e);
				});
			} else {
				Oas30DefinitionConverter.escapeExampleAttributes(oasDef.example);
			}
		}

		// TODO: do we change this?
		if (model.examples != null) {
			const examples: ?any = model.examples;
			if (examples != null && Array.isArray(examples) && !_.isEmpty(examples)) {
				oasDef.example = jsonHelper.parse(jsonHelper.stringify(examples[0]));
			}
		}

		if (model.additionalProperties != null) {
			if (typeof model.additionalProperties === 'object') {
				const additionalProperties: Definition = model.additionalProperties;
				if (additionalProperties.required != null && !additionalProperties.required) {
					delete additionalProperties.required;
				}
				oasDef.additionalProperties = this._export(additionalProperties);
			} else if (typeof model.additionalProperties === 'boolean') {
				oasDef.additionalProperties = model.additionalProperties;
			}
		}

		if (model.items != null) {
			const items: Definition = model.items;
			oasDef.items = this._export(items);
		}

		// if (model.itemsList != null) {
		// 	const itemsList: Definition[] = model.itemsList;
		// 	const items = [];
		// 	for (let i = 0; i < itemsList.length; i++) {
		// 		const def: Definition = itemsList[i];
		// 		items.push(this._export(def));
		// 	}
		// 	oasDef.items = items;
		// }

		if (model.fileReference != null) {
			oasDef['$ref'] = model.fileReference;
		}

		if (model.reference != null) {
			const reference: string = model.reference;
			// if (this.def == null || (
			// 	this.def != null && Object.keys(this.def.components.schemas).includes(reference)
			// 	)) {
			oasDef.$ref = reference.startsWith('http://') ? reference : '#/components/schemas/' + reference;
			// } else {
			// 	oasDef.type = 'string';
			// }
		}

		if (model.properties != null) {
			const properties: Definition[] = model.properties;
			const oasProps = {};
			for (let i = 0; i < properties.length; i++) {
				const prop: Definition = properties[i];
				this.level = 'property';
				oasProps[prop.name] = this._export(prop);
			}

			if (!_.isEmpty(oasProps)) oasDef.properties = oasProps;
			if (model.propsRequired != null && !_.isEmpty(model.propsRequired)) {
				oasDef.required = model.propsRequired;
			}
			delete model.propsRequired;
		}

		if (model.compositionType != null) {
			const allOf: any[] = [];
			_.values(model.compositionType).map(value => {
				const typeModel = this._export(value);
				Oas30DefinitionConverter._convertToInternalType(typeModel);
				if (typeModel.internalType != null || typeModel.$ref != null) allOf.push(this._export(value));
			});

			if (allOf.length === 1) {
				oasDef.type = allOf[0].type;
			} else {
				oasDef.allOf = allOf;
			}
		}

		// if (model.schema != null) {
		// 	const schema: Definition = model.schema;
		// 	oasDef.schema = this._export(schema);
		// }

		if (model.annotations != null && _.isArray(model.annotations) && !_.isEmpty(model.annotations)) {
			const annotationConverter = new Oas30AnnotationConverter();
			_.assign(oasDef, annotationConverter._export(model));
		}

		Oas30DefinitionConverter.checkDefaultType(oasDef);

		return oasDef;
	}

	static createOasDef(definition, attrIdMap, attrIdSkip) {
		const result: any = {};

		_.entries(definition).map(([key, value]) => {
			if (attrIdSkip.indexOf(key) < 0 && !key.startsWith('x-')) {
				result[attrIdMap[key] != null ? attrIdMap[key] : key] = value;
			}
		});

		return result;
	}

	static createDefinition(oasDef, attrIdMap, attrIdSkip) {
		const object = {};

		_.entries(oasDef).map(([key, value]) => {
			if (attrIdSkip.indexOf(key) < 0 && !key.startsWith('x-')) {
				object[attrIdMap[key] != null ? attrIdMap[key] : key] = value;
			}
		});
		const result = new Definition();
		_.assign(result, object);

		return result;
	}

	static _convertFromInternalType(oasDef, level) {
		if (oasDef.internalType == null) return;
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
		} else if (internalType === 'null') {
			if (level === 'type') {
				oasDef.type = 'object';
			} else if (level === 'property') {
				oasDef.type = 'string';
			}
		} else if (internalType === 'timestamp') {
			oasDef.type = 'string';
		} else if (internalType === 'object') {
			oasDef.type = 'object';
		} else if (internalType === 'array') {
			oasDef.type = 'array';
		}

		delete oasDef.internalType;
	}

	static checkDefaultType(oasDef) {
		if (oasDef.type == null) {
			if (oasDef.properties != null) {
				oasDef.type = 'object';
			} else if (oasDef.items != null) {
				oasDef.type = 'array';
			} else if (oasDef.$ref == null && !oasDef.allOf != null) {
				oasDef.type = 'string';
			}
		}
	}

	static escapeExampleAttributes(example) {
		if (example != null) {
			const validTypes = ['string', 'object'];
			if (example.type != null && !validTypes.includes(typeof example.type)) {
				example['x-type'] = example.type;
				delete example.type;
			}
			if (example.$ref != null && !validTypes.includes(typeof example.type)) {
				example['x-$ref'] = example.$ref;
				delete example.$ref;
			}
		}
	}

	static exportExample(example) {
		let oasDef = example;
		Oas30DefinitionConverter.escapeExampleAttributes(oasDef);
		if (oasDef.annotations != null && (_.isArray(oasDef.annotations) || typeof oasDef.annotations === 'object')) {
			const annotationConverter = new Oas30AnnotationConverter();
			_.assign(oasDef, annotationConverter._export(oasDef));
			delete oasDef.annotations;
		}
		for (const id in oasDef) {
			if (!oasDef.hasOwnProperty(id)) continue;

			if (typeof oasDef[id] === 'object' && !_.isEmpty(oasDef[id])) {
				oasDef[id] = Oas30DefinitionConverter.exportExample(oasDef[id]);
			}
		}

		return oasDef;
	}
}

module.exports = Oas30DefinitionConverter;
