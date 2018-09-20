// @flow
const ConverterModel = require('oas-raml-converter-model');
const Definition = ConverterModel.Definition;
const Annotation = ConverterModel.Annotation;
const Converter = require('../converters/converter');
const fileHelper = require('../utils/file');
const _ = require('lodash');
const jsonHelper = require('../utils/json');
const Oas20AnnotationConverter = require('../oas20/oas20AnnotationConverter');

class Oas20DefinitionConverter extends Converter {

	export(models:Definition[]) {
		const result = {};
		for (let i = 0; i < models.length; i++) {
			const model: Definition = models[i];
			const modelName: string = model.name;
			this.level = 'type';
			if (!_.isEmpty(model) && model.hasOwnProperty('annotations') && model.annotations != null) {
				const annotations: Annotation[] = model.annotations;
				const definitionNameAnnotation: Annotation[] = annotations.filter( function(annotation) { return annotation.name === 'oas-definition-name'; });
				if (!_.isEmpty(definitionNameAnnotation)) {
					const annotation: Annotation = definitionNameAnnotation[0];
					const name: any = annotation.definition;
					result[name] = this._export(model);
				} else {
					result[modelName] = this._export(model);
				}
			} else {
				result[modelName] = this._export(model);
			}
		}

		return result;
	}

	_export(model:Definition) {
		const attrIdMap = {
			'_enum': 'enum',
			'_default': 'default',
			'displayName': 'title'
		};

		const attrIdSkip = ['name', 'fileReference', 'reference', 'properties', 'compositionType', 'oneOf', 'schema', 'items',
			'itemsList', 'additionalProperties', 'jsonValue', 'schemaPath', 'examples', '$schema', 'id', 
			'fileTypes', 'annotations', 'includePath', 'expanded'];
		
		const oasDef = Oas20DefinitionConverter.createOasDef(model, attrIdMap, attrIdSkip);

		if (oasDef.hasOwnProperty('internalType')) {
			Oas20DefinitionConverter._convertFromInternalType(oasDef, this.level);
		}

		if (model.hasOwnProperty('example') && model.example != null) {
			const example = jsonHelper.parse(jsonHelper.stringify(model.example));

			if (typeof example === 'object' && !_.isArray(example) && example != null) {
				oasDef['example'] = Oas20DefinitionConverter.exportExample(example);
			} else {
				oasDef['example'] = example;
			}

			if (typeof oasDef['example'] === 'number' && typeof model.example === 'string')
				oasDef['example'] = jsonHelper.stringify(model.example);
			if (_.isArray(oasDef['example'])) oasDef.example.map(e => { Oas20DefinitionConverter.escapeExampleAttributes(e); });
			else Oas20DefinitionConverter.escapeExampleAttributes(oasDef.example);
		}

		if (model.hasOwnProperty('examples')) {
			const examples: ?any = model.examples;
			if (_.isArray(examples) && !_.isEmpty(examples) && examples != null) {
				oasDef['example'] = jsonHelper.parse(jsonHelper.stringify(examples[0]));
			}
		}

		if (model.hasOwnProperty('additionalProperties') && model.additionalProperties != null) {
			if (typeof model.additionalProperties === 'object') {
				const additionalProperties: Definition = model.additionalProperties;
				if (additionalProperties.hasOwnProperty('required') && !additionalProperties.required)
					delete additionalProperties.required;
				oasDef.additionalProperties = this._export(additionalProperties);
			} else {
				oasDef.additionalProperties = model.additionalProperties;
			}
		}

		if (model.hasOwnProperty('items') && model.items != null) {
			const items: Definition = model.items;
			oasDef.items = this._export(items);
		}
		
		if (model.hasOwnProperty('itemsList') && model.itemsList != null) {
			const itemsList: Definition[] = model.itemsList;
			const items = [];
			for (let i = 0; i < itemsList.length; i++) {
				const def: Definition = itemsList[i];
				items.push(this._export(def));
			}
			oasDef.items = items;
		}

		if (model.hasOwnProperty('fileReference')) {
			oasDef['$ref'] = model.fileReference;
		}

		if (model.hasOwnProperty('reference') && model.reference != null) {
			const reference: string = model.reference;
			if (!this.def || (this.def && this.def.definitions && _.keys(this.def.definitions).includes(reference)))
				oasDef.$ref = reference.startsWith('http://') ? reference : '#/definitions/' + reference;
			else
				oasDef.type = 'string';
		}

		if (model.hasOwnProperty('properties') && model.properties != null) {
			const properties: Definition[] = model.properties;
			const oasProps = {};
			for (let i = 0; i < properties.length; i++) {
				const prop: Definition = properties[i];
				this.level = 'property';
				oasProps[prop.name] = this._export(prop);
			}

			if (!_.isEmpty(oasProps)) oasDef.properties = oasProps;
			if (!_.isEmpty(model.propsRequired)) {
				oasDef.required = model.propsRequired;
			}
			delete oasDef.propsRequired;
		}

		if (model.hasOwnProperty('compositionType')) {
			const allOf: any[] = [];
			_.values(model.compositionType).map(value => {
				const typeModel = this._export(value);
				Oas20DefinitionConverter._convertToInternalType(typeModel);
				if (typeModel.hasOwnProperty('internalType') || typeModel.hasOwnProperty('$ref')) allOf.push(this._export(value));
			});

			if (allOf.length === 1) oasDef.type = allOf[0].type;
			else oasDef.allOf = allOf;
		}

		if (model.hasOwnProperty('oneOf')) {
			const oneOf: string[] = [];
			_.values(model.oneOf).map(val => {
				oneOf.push(this._export(val));
			});
			oasDef.oneOf = oneOf;
		}
		
		if (model.hasOwnProperty('schema') && model.schema != null){
			const schema: Definition = model.schema;
			oasDef.schema = this._export(schema);
		}

		if (model.hasOwnProperty('annotations') && _.isArray(model.annotations) && !_.isEmpty(model.annotations)) {
			const annotationConverter = new Oas20AnnotationConverter();
			_.assign(oasDef, annotationConverter._export(model));
		}

		Oas20DefinitionConverter.checkDefaultType(oasDef);

		return oasDef;
	}

	static createOasDef(definition, attrIdMap, attrIdSkip) {
		const result: any = {};
		
		_.entries(definition).map(([key, value]) => {
			if (attrIdSkip.indexOf(key) < 0 && !key.startsWith('x-')) {
				result[attrIdMap.hasOwnProperty(key) ? attrIdMap[key] : key] = value;
			}
		});
		
		return result;
	}
	
	static createDefinition(oasDef, attrIdMap, attrIdSkip) {
		const object = {};

		_.entries(oasDef).map(([key, value]) => {
			if (attrIdSkip.indexOf(key) < 0 && !key.startsWith('x-')) {
				object[attrIdMap.hasOwnProperty(key) ? attrIdMap[key] : key] = value;
			}
		});
		const result = new Definition();
		_.assign(result, object);

		return result;
	}
	
	import(oasDefs:any) {
		const result: Definition[] = [];
		if (_.isEmpty(oasDefs)) return result;
		
		for (const name in oasDefs) {
			if (!oasDefs.hasOwnProperty(name)) continue;
			
			const value = oasDefs[name];
			const definition: Definition = this._import(value);
			definition.name = name;
			result.push(definition);
		}
		
		return result;
	}
	
	_import(oasDef:any) {
		const attrIdMap = {
			'default': '_default'
		};

		const attrIdSkip = ['enum', '$ref', 'properties', 'allOf', 'oneOf', 'schema', 'items', 'additionalProperties', 'example', 'required'];
		const model: Definition = Oas20DefinitionConverter.createDefinition(oasDef, attrIdMap, attrIdSkip);

		if (model.hasOwnProperty('type')) {
			Oas20DefinitionConverter._convertToInternalType(model);
		}

		if (oasDef.hasOwnProperty('enum') && oasDef.type !== 'boolean') {
			model._enum = oasDef.enum;
		}

		if (oasDef.hasOwnProperty('$ref')) {
			const value: string = oasDef['$ref'];
			const name: string = value.replace('#/definitions/', '');
			const existingType: boolean = this.def && _.keys(this.def.definitions).includes(name);
			if (!existingType && fileHelper.isFilePath(value)) {
				model.fileReference = value;
			} else {
				model.reference = name;
			}
		}

		if (oasDef.hasOwnProperty('items')) {
			const items = oasDef.items;
			if (_.isArray(items)) {
				const itemsList: Definition[] = [];
				for (let i = 0; i < items.length; i++) {
					const definition: Definition = this._import(items[i]);
					itemsList.push(definition);
				}
				model.itemsList = itemsList;
			} else {
				model.items = this._import(oasDef.items);
			}
		}

		if (oasDef.hasOwnProperty('additionalProperties')) {
			model.additionalProperties = (typeof oasDef.additionalProperties === 'object') ? this._import(oasDef.additionalProperties) : oasDef.additionalProperties;
		}

		if (oasDef.hasOwnProperty('required') && _.isBoolean(oasDef.required)) {
			model.required = oasDef.required;
		}
		
		if (oasDef.hasOwnProperty('properties')) {
			const modelProps: Definition[] = [];
			const required = [];

			_.entries(oasDef.properties).map(([key, value]) => {
				if (value) {
					const prop: Definition = this._import(value);
					prop.name = key;
					if (!value.hasOwnProperty('required') || value.required) required.push(prop.name);
					modelProps.push(prop);
				}
			});

			model.properties = modelProps;
			if (oasDef.hasOwnProperty('required') && _.isArray(oasDef.required)) {
				model.propsRequired = oasDef.required;
			} else {
				model.propsRequired = required;
			}
		}

		if (oasDef.hasOwnProperty('allOf')) {
			const composition: Definition[] = [];

			_.values(oasDef['allOf']).map(val => {
				composition.push(this._import(val));
			});

			model.compositionType = composition;
		}

		if (oasDef.hasOwnProperty('oneOf')) {
			const oneOf: Definition[] = [];

			_.values(oasDef['oneOf']).map(val => {
				oneOf.push(this._import(val));
			});

			model.oneOf = oneOf;
		}

		if (oasDef.hasOwnProperty('schema')) {
			model.schema = this._import(oasDef.schema);
		}

		if (oasDef.hasOwnProperty('example') && oasDef.example) {
			if (typeof oasDef.example === 'object' && !_.isArray(oasDef.example)) {
				model.example = Oas20DefinitionConverter.importExample(oasDef.example);
			} else {
				model.example = oasDef.example;
			}
		}

		const annotationConverter = new Oas20AnnotationConverter(this.model);
		const annotations: Annotation[] = annotationConverter._import(oasDef);
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
		if (type === 'object') model.internalType = 'object';
		if (type === 'array') model.internalType = 'array';

		if (model.hasOwnProperty('internalType')) {
			delete model.type;
			delete model.format;
		}
	}

	static _convertFromInternalType(oasDef, level) {
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
		} else if (internalType === 'null') {
			if (level === 'type') {
				oasDef.type = 'object';
			} else if (level === 'property'){
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
		if (!oasDef.hasOwnProperty('type')) {
			if (oasDef.hasOwnProperty('properties')) {
				oasDef.type = 'object';
			} else if (oasDef.hasOwnProperty('items')) {
				oasDef.type = 'array';
			} else if (!oasDef.hasOwnProperty('$ref') && !oasDef.hasOwnProperty('allOf') && !oasDef.hasOwnProperty('oneOf')) {
				oasDef.type = 'string';
			}
		}
	}

	static escapeExampleAttributes(example) {
		if (example != null) {
			const validTypes = ['string', 'object'];
			if (example.hasOwnProperty('type') && !validTypes.includes(typeof example.type)) {
				example['x-type'] = example.type;
				delete example.type;
			}
			if (example.hasOwnProperty('$ref') && !validTypes.includes(typeof example.type)) {
				example['x-$ref'] = example.$ref;
				delete example.$ref;
			}
		}
	}

	static importExample(example) {
		const model = example;
		for (const id in model) {
			if (!model.hasOwnProperty(id)) continue;

			if (typeof model[id] === 'object' && !_.isEmpty(model[id]))
				model[id] = Oas20DefinitionConverter.importExample(model[id]);
			const converter = new Oas20AnnotationConverter();
			const annotations: Annotation[] = converter._import(model[id]);
			if (!_.isEmpty(annotations)) model[id].annotations = annotations;
		}

		return model;
	}

	static exportExample(example) {
		let oasDef = example;
		Oas20DefinitionConverter.escapeExampleAttributes(oasDef);
		if (oasDef.hasOwnProperty('annotations') && (_.isArray(oasDef.annotations) || typeof oasDef.annotations === 'object')) {
			const annotationConverter = new Oas20AnnotationConverter();
			_.assign(oasDef, annotationConverter._export(oasDef));
			delete oasDef.annotations;
		}
		for (const id in oasDef) {
			if (!oasDef.hasOwnProperty(id)) continue;

			if (typeof oasDef[id] === 'object' && !_.isEmpty(oasDef[id]))
				oasDef[id] = Oas20DefinitionConverter.exportExample(oasDef[id]);
		}

		return oasDef;
	}
}

module.exports = Oas20DefinitionConverter;
