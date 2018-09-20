// @flow
const _ = require('lodash');
const ConverterModel = require('oas-raml-converter-model');
const Definition = ConverterModel.Definition;
const Root = ConverterModel.Root;
const Annotation = ConverterModel.Annotation;
const Converter = require('../converters/converter');
const helper = require('../helpers/converter');
const jsonHelper = require('../utils/json');
const arrayHelper = require('../utils/array');
const ramlHelper = require('../helpers/raml');
const stringHelper = require('../utils/strings');
const xmlHelper = require('../utils/xml');
const RamlAnnotationConverter = require('../raml/ramlAnnotationConverter');
const RamlCustomAnnotationConverter = require('../raml/ramlCustomAnnotationConverter');

class RamlDefinitionConverter extends Converter {

	export(models: Definition[]) {
		const result = {};
		this.level = 'type';

		for (let i = 0; i < models.length; i++) {
			const model: Definition = models[i];
			const modelName: string = model.name;
			const name = stringHelper.checkAndReplaceInvalidChars(modelName, ramlHelper.getValidCharacters, ramlHelper.getReplacementCharacter);
			result[name] = this._export(model);
			if (modelName !== name) {
				const annotationName = this.annotationPrefix + '-definition-name';
				RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, annotationName);
				result[name]['(' + annotationName + ')'] = modelName;
			}
		}

		return result;
	}

	_export(model: Definition) {
		if (model.hasOwnProperty('jsonValue')) {
			return model.jsonValue;
		}

		const attrIdMap = {
			'_enum': 'enum',
			'_default': 'default'
		};

		const attrIdSkip = ['name', 'type', 'reference', 'properties', 'items', 'compositionType', 'oneOf', 'in', 'schema',
			'additionalProperties', 'title', 'items', 'itemsList', 'exclusiveMaximum', 'exclusiveMinimum', 'readOnly', 
			'externalDocs', '$schema', 'annotations', 'collectionFormat', 'allowEmptyValue', 'fileReference', 
			'_enum', 'error', 'warning', 'includePath', 'expanded'];

		const ramlDef = RamlDefinitionConverter.createRamlDef(model, attrIdMap, attrIdSkip);

		if (model.hasOwnProperty('type')) {
			if (typeof model.type === 'object' && model.type) {
				const type: Definition = model.type;
				ramlDef.type = _.isArray(type) ? type : this._export(type);
			} else {
				ramlDef.type = model.type;
				if (model.hasOwnProperty('format')) {
					const id = this.annotationPrefix + '-format';
					RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
					ramlDef['(' + id + ')'] = model.format;
					delete ramlDef.format;
				}
			}
		}

		if (model.hasOwnProperty('fileReference') && model.fileReference) {
			ramlDef.type = '!include ' + model.fileReference.replace('#/', '#');
		}

		if (ramlDef.hasOwnProperty('internalType')) {
			this._convertFromInternalType(ramlDef);
		}

		if (ramlDef.type !== 'string' && ramlDef.type !== 'file' && !model.reference) {
			if (ramlDef.hasOwnProperty('minLength')) delete ramlDef.minLength;
			if (ramlDef.hasOwnProperty('maxLength')) delete ramlDef.maxLength;
		}

		if (model.hasOwnProperty('items') && model.items != null) {
			const itemsModel: Definition = model.items;
			const items = this._export(itemsModel);
			if (items && typeof items === 'object' && items.hasOwnProperty('format') && items.format === 'string') {
				items.type = items.format;
				delete items.format;
			}
			if (ramlDef.type !== 'array') ramlDef.type = 'array';
			if (ramlDef.hasOwnProperty('enum')) delete ramlDef.enum;
			ramlDef.items = items;
		}

		if (model.hasOwnProperty('itemsList') && model.itemsList != null) {
			const itemsList: Definition[] = model.itemsList;
			const items = [];
			for (let i = 0; i < itemsList.length; i++) {
				const def: Definition = itemsList[i];
				items.push(this._export(def));
			}
			ramlDef.items = items;
		}

		if (model.hasOwnProperty('reference') && model.reference != null) {
			const val: string = model.reference;
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

		if (model.hasOwnProperty('_enum') && model._enum != null) {
			const enumModel: string[] = model._enum;
			const isString: boolean = ramlDef.type === 'string';
			const isNumeric: boolean = ramlDef.type === 'integer' || ramlDef.type === 'number';
			const isDateOnly: boolean = ramlDef.type === 'date-only';
			const _enum = [];
			for (let i = 0; i < enumModel.length; i++) {
				let item = enumModel[i];
				if (isString) item = item.toString();
				else if (isNumeric) item = Number(item);
				else if (isDateOnly) item = item.replace('_', '-').replace('_', '-');
				_enum.push(item);
			}
			ramlDef.enum = _enum;
		}

		if (model.hasOwnProperty('properties') && model.properties != null) {
			const properties: Definition[] = model.properties;
			const ramlProps = {};
			for (let i = 0; i < properties.length; i++) {
				const value: Definition = properties[i];
				const name: string = value.name;
				ramlProps[name] = this._export(value);

				if (!model.hasOwnProperty('propsRequired')) {
					ramlProps[name].required = false;
				} else if (model.hasOwnProperty('propsRequired') && model.propsRequired != null) {
					const propsRequired: string[] = model.propsRequired;
					if (_.isEmpty(propsRequired) || propsRequired.indexOf(name) < 0) ramlProps[name].required = false;
				}
			}

			if (!_.isEmpty(ramlProps)) ramlDef.properties = ramlProps;
			delete ramlDef.propsRequired;
		}

		if (model.hasOwnProperty('compositionType') && model.compositionType != null) {
			const result = {};
			for (let i = 0; i < model.compositionType.length; i++) {
				const value: Definition = model.compositionType[i];
				const val = this._export(value);
				if (val && typeof val === 'object') {
					if (val.hasOwnProperty('properties')) {
						delete val.type;
						_.merge(result, val);
					} else if (result.hasOwnProperty('type') && val.hasOwnProperty('type')) {
						const type = result.type;
						if (typeof type === 'string') result.type = [result.type, val.type];
						else if (_.isArray(type)) result.type = result.type.concat(val.type);
						delete val.type;
						_.merge(result, val);
					} else {
						_.assign(result, val);
					}
				}
			}

			_.assign(ramlDef, result);
			delete ramlDef.compositionType;
		}

		if (model.hasOwnProperty('oneOf')) {
			let result = '';
			for (let i = 0; i < model.oneOf.length; i++) {
				if (result.length > 0) result = result.concat(' | ');
				const value: Definition = model.oneOf[i];
				const val = this._export(value);
				result = result.concat(val.type);
			}

			ramlDef.type = result;
		}

		if (model.hasOwnProperty('schema') && model.schema != null) {
			const schema: Definition = model.schema;
			ramlDef.schema = this._export(schema);
		}

		if (model.hasOwnProperty('additionalProperties') && model.additionalProperties != null) {
			if (typeof model.additionalProperties === 'object') {
				const additionalProperties: Definition = model.additionalProperties;
				if (!ramlDef.hasOwnProperty('properties')) {
					ramlDef.properties = {};
				}
				ramlDef.properties['//'] = this._export(additionalProperties);
				delete ramlDef.additionalProperties;
			} else {
				ramlDef.additionalProperties = model.additionalProperties;
			}
		}

		if (model.hasOwnProperty('example')) {
			if (model.hasOwnProperty('type') && scalarNumberTypes.indexOf(model.type) >= 0) {
				ramlDef['example'] = _.toNumber(model.example);
			} else {
				let example = jsonHelper.parse(model.example);
				if (typeof example === 'object' && !_.isArray(example)) {
					ramlDef['example'] = RamlDefinitionConverter.exportExample(example, this.model, this.def);
					if (this.level === 'type' && !ramlDef.hasOwnProperty('type') && !ramlDef.hasOwnProperty('properties')) ramlDef.type = 'object';
				} else {
					if (_.isNumber(example) && ramlDef.type === 'string') example = example.toString();
					ramlDef['example'] = example;
				}
			}
		}

		if (model.hasOwnProperty('exclusiveMaximum')) {
			const id = this.annotationPrefix + '-exclusiveMaximum';
			RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.exclusiveMaximum;
		}
		if (model.hasOwnProperty('exclusiveMinimum')) {
			const id = this.annotationPrefix + '-exclusiveMinimum';
			RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.exclusiveMinimum;
		}
		if (model.hasOwnProperty('title')) {
			const id = this.annotationPrefix + '-schema-title';
			RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.title;
		}
		if (model.hasOwnProperty('readOnly')) {
			const id = this.annotationPrefix + '-readOnly';
			RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.readOnly;
		}
		if (model.hasOwnProperty('collectionFormat')) {
			const id = this.annotationPrefix + '-collectionFormat';
			RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.collectionFormat;
		}
		if (model.hasOwnProperty('allowEmptyValue')) {
			const id = this.annotationPrefix + '-allowEmptyValue';
			RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.allowEmptyValue;
		}
		if (model.hasOwnProperty('externalDocs')) {
			const id = this.annotationPrefix + '-externalDocs';
			RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.externalDocs;
		}
		if (ramlDef.hasOwnProperty('maximum') && ramlDef.maximum && ramlDef.hasOwnProperty('type') && scalarNumberTypes.indexOf(ramlDef.type) < 0 && !model.reference) {
			const id = this.annotationPrefix + '-maximum';
			RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = ramlDef.maximum;
			delete ramlDef.maximum;
		}
		if (ramlDef.hasOwnProperty('minimum') && ramlDef.minimum && ramlDef.hasOwnProperty('type') && scalarNumberTypes.indexOf(ramlDef.type) < 0 && !model.reference) {
			const id = this.annotationPrefix + '-minimum';
			RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = ramlDef.minimum;
			delete ramlDef.minimum;
		}
		if (model.hasOwnProperty('annotations') && _.isArray(model.annotations) && !_.isEmpty(model.annotations)) {
			const annotationConverter = new RamlAnnotationConverter(this.model, this.annotationPrefix, this.def);
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

	static createRamlDef(definition, attrIdMap, attrIdSkip) {
		const result: any = {};

		_.assign(result, definition);
		attrIdSkip.map(id => {
			delete result[id];
		});
		_.keys(attrIdMap).map(id => {
			const value = result[id];
			if (value != null) {
				result[attrIdMap[id]] = value;
				delete result[id];
			}
		});

		return result;
	}

	static createDefinition(ramlDef, attrIdMap, attrIdCopy) {
		const object = {};

		_.entries(ramlDef).map(([key, value]) => {
			if (attrIdCopy.indexOf(key) >= 0 || key.startsWith('(')) {
				object[attrIdMap.hasOwnProperty(key) ? attrIdMap[key] : key] = value;
			}
		});
		const result = new Definition();
		_.assign(result, object);

		return result;
	}

	import(ramlDefs: any) {
		let result: Definition[] = [];
		if (_.isEmpty(ramlDefs)) return result;
		if (ramlHelper.isRaml08Version(this.version)) return this.importRAML08(ramlDefs);

		helper.removePropertiesFromObject(ramlDefs, ['fixedFacets']);

		for (const index in ramlDefs) {
			if (!ramlDefs.hasOwnProperty(index)) continue;
			const entry = ramlDefs[index];

			for (const key in entry) {
				if (!entry.hasOwnProperty(key)) continue;
				const value = entry[key];
				if (value.hasOwnProperty('typePropertyKind') && value.typePropertyKind === 'JSON') {
					const schema = value.schema && _.isArray(value.schema) ? value.schema : value.type;
					const jsonValue = RamlDefinitionConverter._readTypeAttribute(schema);
					const parse = jsonHelper.parse(jsonValue);
					if (parse && parse.hasOwnProperty('definitions')) {
						const definitions: Definition[] = this.import(RamlDefinitionConverter._convertMapToArray(parse.definitions));
						result = result.concat(definitions);
						delete parse.definitions;
						value.type[0] = jsonHelper.stringify(parse);
					}
					const definition: Definition = this._import(parse);
					definition.name = key;
					definition.jsonValue = jsonValue;
					result.push(definition);
				} else {
					const definition: Definition = this._import(value);
					definition.name = key;
					result.push(definition);
				}
			}
		}

		return result;
	}

	importRAML08(ramlDefs: any) {
		let result: Definition[] = [];
		if (_.isEmpty(ramlDefs)) return result;

		if (_.isArray(ramlDefs) && !_.isEmpty(ramlDefs)) {
			for (const id in ramlDefs) {
				if (!ramlDefs.hasOwnProperty(id)) continue;

				const value = ramlDefs[id];
				const name = _.keys(value)[0];
				if (this.types && this.types.includes(name)) continue;
				let schema = helper.isJson(value[name]) ? JSON.parse(value[name]) : value[name];
				if (schema.hasOwnProperty('definitions')) {
					const definitions: Definition[] = this.importRAML08(RamlDefinitionConverter._convertMapToArray(schema.definitions));
					result = result.concat(definitions);
					delete schema.definitions;
				}
				if (xmlHelper.isXml(schema)) schema = {type: schema};
				const definition: Definition = this._import(schema);
				definition.name = name;
				result.push(definition);
			}
		}
		const typeNames: string[] = result.map(type => {
			return type.name;
		});
		this.types = this.types ? this.types.concat(typeNames) : typeNames;

		return result;
	}

	_import(ramlDef: any) {
		const attrIdMap = {
			'default': '_default'
		};

		RamlDefinitionConverter._convertAnnotations(ramlDef);

		const attrIdCopyRaml = ['title', 'format', 'maxLength', 'minLength', 'exclusiveMaximum', 'exclusiveMinimum', 
			'maximum', 'minimum', 'definitions', 'minProperties', 'maxProperties', 'minItems', 'maxItems', 
			'default', 'uniqueItems', 'fileTypes'];
		const attrIdCopyRaml10 = _.concat(attrIdCopyRaml, ['name', 'discriminator', 'multipleOf', 'pattern', 
			'displayName', 'default', 'schemaPath', 'required', 'xml', 'additionalProperties', 'minItems', 'maxItems', 
			'annotations', 'allowedTargets', '$ref', 'minProperties', 'maxProperties']);
		const attrIdCopyRaml08 = _.concat(attrIdCopyRaml, ['pattern', 'additionalProperties']);
		const jsonType = ramlDef.hasOwnProperty('typePropertyKind') ? ramlDef.typePropertyKind === 'JSON' : false;
		const inplaceType = ramlDef.hasOwnProperty('typePropertyKind') ? ramlDef.typePropertyKind === 'INPLACE' : (ramlDef.hasOwnProperty('type') && typeof ramlDef.type === 'object' && !_.isArray(ramlDef.type));
		const isRaml08Version = ramlHelper.isRaml08Version(this.version);

		if (isRaml08Version && typeof ramlDef === 'string') ramlDef = {type: ramlDef};

		if (inplaceType) {
			let value;
			if (ramlDef.hasOwnProperty('type')) {
				value = jsonHelper.parse(RamlDefinitionConverter._readTypeAttribute(ramlDef.type));
				if (typeof value === 'object') {
					if (isRaml08Version) {
						_.assign(ramlDef, value);
						delete ramlDef.type;
					} else {
						delete ramlDef.type;
						_.merge(ramlDef, value);
					}
				}
			} else if (ramlDef.hasOwnProperty('schema')) {
				value = RamlDefinitionConverter._readTypeAttribute(ramlDef.schema);
				_.assign(ramlDef, jsonHelper.parse(value));
				delete ramlDef.schema;
			}
		}

		const model: Definition = isRaml08Version ? RamlDefinitionConverter.createDefinition(ramlDef, attrIdMap, attrIdCopyRaml08) : RamlDefinitionConverter.createDefinition(ramlDef, attrIdMap, attrIdCopyRaml10);

		if (isRaml08Version) {
			if (ramlDef.hasOwnProperty('$ref')) {
				model.reference = ramlDef.$ref.startsWith('http://') ? ramlDef.$ref : ramlDef.$ref.replace('#/schemas/', '').replace('#/definitions/', '');
			}
		}

		if (ramlDef.hasOwnProperty('oneOf')) {
			if (ramlDef.oneOf.length > 1) {
				ramlDef.type = 'object';
			} else {
				ramlDef = Object.assign(ramlDef, ramlDef.oneOf[0]);
			}
			delete ramlDef.oneOf;
		}

		if (jsonType) {
			model.jsonValue = RamlDefinitionConverter._readTypeAttribute(ramlDef.type);
		}
		else {
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
						ramlDef.items = {type: 'string'};
					}
					// TODO: check lrg cases
					/*if (ramlDef.type === 'array') {
						for (const id in model) {
							if (!model.hasOwnProperty(id)) continue;
							
							if (id != 'items' && _.isArray(model[id])) delete model[id];
						}
					}*/
				}
				const value = RamlDefinitionConverter._readTypeAttribute(ramlDef.type);
				if (_.isArray(value)) {
					const compositionType: Definition[] = [];
					value.map(entry => {
						const typeModel = new Definition();
						this._convertSimpleType(entry, typeModel);
						compositionType.push(typeModel);
					});
					if (arrayHelper.allEqual(compositionType)) {
						_.merge(model, compositionType[0]);
					} else {
						model.compositionType = compositionType;
					}
				} else {
					if (typeof value === 'object') {
						// TODO: check lrg cases
						// model.type = this._import(value);
					} else if (value.indexOf('|') > -1) {
						this._convertOneOfType(value, model);
					} else {
						this._convertSimpleType(value, model);
					}
				}
			} else {
				//default type is string
				if (!ramlDef.hasOwnProperty('properties') && !ramlDef.hasOwnProperty('$ref'))
					model.type = 'string';
			}

			RamlDefinitionConverter._convertToInternalType(model);
		}

		if (ramlDef.hasOwnProperty('properties')) {
			const required: string[] = ramlDef.hasOwnProperty('required') && _.isArray(ramlDef.required) ? ramlDef.required.filter(function (req) {
				return Object.keys(ramlDef.properties).includes(req);
			}) : [];
			const ignoreRequired = !_.isEmpty(required);

			const modelProps: Definition[] = [];
			for (const id in ramlDef.properties) {
				if (!ramlDef.properties.hasOwnProperty(id)) continue;

				let value = ramlDef.properties[id];
				if (id.startsWith('/') && id.endsWith('/')) { //additionalProperties
					model.additionalProperties = this._import(value);
				} else {
					if (!required.includes(id) && (!ignoreRequired && !isRaml08Version && !value.hasOwnProperty('required') || (value.hasOwnProperty('required') && value.required === true)))
						required.push(id);

					if (_.isBoolean(value.required)) delete value.required;

					//union type property
					if (_.isArray(value)) {
						const val = {name: id, type: []};
						value.map(v => {
							val.type.push(RamlDefinitionConverter._readTypeAttribute(v.type));
						});
						value = val;
					}

					const prop: Definition = this._import(value);
					prop.name = id;
					modelProps.push(prop);
				}
			}
			if (ramlDef.type === 'array' && !ramlDef.hasOwnProperty('items')) {
				const items: Definition = new Definition();
				items.type = 'object';
				items.properties = modelProps;
				if (!_.isEmpty(required)) items.propsRequired = required;
				model.items = items;
			} else {
				model.properties = modelProps;
				if (!_.isEmpty(required)) model.propsRequired = required;
			}
		}

		if (ramlDef.hasOwnProperty('items')) {
			const value = RamlDefinitionConverter._readTypeAttribute(ramlDef.items);
			if (typeof value === 'string') {
				const modelItems = new Definition();
				if (value.endsWith('[]')) {
					modelItems.type = 'array';
					const def = new Definition();
					this._convertSimpleType(value.replace('[]', ''), def);
					RamlDefinitionConverter._convertToInternalType(def);
					modelItems.items = def;
				} else {
					this._convertSimpleType(value, modelItems);
					RamlDefinitionConverter._convertToInternalType(modelItems);
				}
				model.items = modelItems;
			} else if (isRaml08Version && _.isArray(ramlDef.items)) {
				if (_.isEmpty(ramlDef.items)) {
					const modelItems = new Definition();
					modelItems.type = 'string';
					model.items = modelItems;
				} else if (ramlDef.items.length === 1) {
					const items = ramlDef.items[0];
					model.items = this._import(items);
				} else {
					const modelItems: Definition[] = [];
					for (let i = 0; i < ramlDef.items.length; i++) {
						const items: Definition = this._import(ramlDef.items[i]);
						modelItems.push(items);
					}
					if (!_.isEmpty(modelItems)) model.itemsList = modelItems;
				}
			} else {
				const items = RamlDefinitionConverter._readTypeAttribute(ramlDef.items);
				model.items = this._import(items);
			}
		}

		if (ramlDef.hasOwnProperty('schema')) {
			// TODO: check lrg cases
			// const schema: Definition = this._export(ramlDef.schema);
			// model.schema = schema;
		}

		//composition type
		if (model.hasOwnProperty('reference') && model.hasOwnProperty('properties')) { //todo check
			const composition: Definition[] = [];
			const definition = new Definition();
			definition.reference = model.reference;
			composition.push(definition);
			const properties = new Definition();
			properties.properties = model.properties;
			properties.propsRequired = model.propsRequired ? model.propsRequired : [];
			if (model.hasOwnProperty('additionalProperties')) {
				properties.additionalProperties = model.additionalProperties;
				delete model.additionalProperties;
			}
			composition.push(properties);

			delete model.reference;
			delete model.properties;
			delete model.propsRequired;

			model.compositionType = composition;
		}

		if (ramlDef.hasOwnProperty('description') && !_.isEmpty(ramlDef.description) && typeof ramlDef.description === 'string') {
			model.description = ramlDef.description;
		}

		if (ramlDef.hasOwnProperty('examples')) {
			const ramlExamples: any[] = ramlDef.examples;
			const examples: any[] = [];
			for (let i = 0; i < ramlExamples.length; i++) {
				const entry: any = ramlExamples[i];
				const result = jsonHelper.parse(entry.value);
				if (entry.hasOwnProperty('strict') && !entry.strict) {
					result.strict = entry.strict;
				}
				examples[i] = result;
			}

			if (_.isArray(examples)) model.examples = examples;
		}

		if (ramlDef.hasOwnProperty('example')) {
			let example: any;
			if (typeof ramlDef.example === 'object' && !_.isArray(ramlDef.example) && !_.isEmpty(ramlDef.example)) {
				const annotationConverter = new RamlAnnotationConverter();
				const annotations: Annotation[] = annotationConverter._import(ramlDef.example);
				if (!_.isEmpty(annotations)) ramlDef.example.annotations = annotations;
				example = ramlDef.example;
			} else {
				example = ramlDef.example;
			}
			if (ramlDef.hasOwnProperty('structuredExample') && ramlDef.structuredExample.hasOwnProperty('strict') && !ramlDef.structuredExample.strict) {
				if (typeof example === 'object')
					example.strict = ramlDef.structuredExample.strict;
				else
					example = {value: model.example, strict: ramlDef.structuredExample.strict};
			}
			model.example = example;
		}

		if (ramlDef.hasOwnProperty('enum') && ramlDef.type !== 'boolean') {
			model._enum = ramlDef.enum;
		}

		if (model.hasOwnProperty('required') && !model.hasOwnProperty('properties') && _.isArray(model.required)) {
			delete model.required;
		}

		if (ramlDef.hasOwnProperty('sourceMap') && ramlDef['sourceMap'].hasOwnProperty('path')) {
			model['includePath'] = ramlDef['sourceMap']['path'];
			delete ramlDef['sourceMap'];
		}

		return model;
	}

	_convertSimpleType(entry: string, model: any) {
		if (typeof entry !== 'string' || entry === undefined) return;
		let val;
		if (entry.indexOf('|') < 0) {
			val = entry.replace('(', '').replace(')', '');
		} else {
			let scalarType = true;
			entry.split('|').map(part => {
				if (part !== '' && scalarTypes.indexOf(part) < 0) {
					scalarType = false;
				}
			});
			val = scalarType ? 'string' : 'object';
		}
		val = val.endsWith('?') || xmlHelper.isXml(val) ? 'object' : val;
		if (val.endsWith('[]')) {
			val = val.replace('[]', '');
			_.assign(model,
				{
					type: 'array',
					items: {}
				});

			this._convertSimpleType(val, model.items);
		} else {
			const isRaml08Version = ramlHelper.isRaml08Version(this.version);
			const builtinTypes = isRaml08Version ? raml08BuiltinTypes : raml10BuiltinTypes;
			if (builtinTypes.indexOf(val) < 0) {
				if (isRaml08Version && this.def && this.def.schemas && !this.def.schemas.map(schema => _.keys(schema)[0]).includes(val))
					model.type = 'string';
				else model.reference = val;
			}
			else model.type = val;
		}
	}

	_convertOneOfType(values: string, model: any) {
		const types = values.split('|');
		const oneOf: Definition[] = [];
		for (let i = 0; i < types.length; i++) {
			const type: string = types[i];
			oneOf.push(this._import({ type: type.split(' ').join('') }));
		}
		model.oneOf = oneOf;
	}

	static _readTypeAttribute(value) {
		if (_.isArray(value) && !_.isEmpty(value) && _.size(value) === 1)
			return value[0];

		return value;
	}

	static _convertAnnotations(ramlDef) {
		const annotationConverter = new RamlAnnotationConverter();
		const annotations: Annotation[] = annotationConverter._import(ramlDef);
		if (!_.isEmpty(annotations)) ramlDef.annotations = annotations;
	}

	static _convertToInternalType(model) {
		const hasFormat = model.hasOwnProperty('format');
		const type = model.type;
		const format = hasFormat ? model.format : null;

		if (type === 'integer') model.internalType = 'integer';
		if (type === 'number') model.internalType = 'number';
		if (type === 'boolean') model.internalType = 'boolean';
		if (type === 'string' && !hasFormat) model.internalType = 'string';
		if (type === 'any') model.internalType = 'string';
		if (type === 'date') model.internalType = 'datetime';
		if (type === 'time-only') model.internalType = 'timeonly';
		if (type === 'datetime' && (format === 'rfc3339' || format === 'rfc2616' || !format)) model.internalType = 'datetime';
		else if (type === 'datetime' && format) model.internalType = 'string';
		if (type === 'datetime-only') model.internalType = 'datetimeonly';
		if (type === 'date-only') model.internalType = 'dateonly';
		if (type === 'file') model.internalType = 'file';
		if (type === 'null') model.internalType = 'null';
		if (type === 'timestamp') model.internalType = 'timestamp';
		if (type === 'object') model.internalType = 'object';
		if (type === 'array') model.internalType = 'array';

		if (model.hasOwnProperty('internalType')) {
			delete model.type;
			if ((model.internalType === 'integer' && !integerValidFormats.includes(format)) ||
				(model.internalType === 'number' && !numberValidFormats.includes(format)))
				delete model.format;
		}
	}

	static exportExample(example: any, model: Root, def: any) {
		let ramlDef = example;
		if (ramlDef.hasOwnProperty('annotations')) {
			const annotationConverter = new RamlAnnotationConverter(model, '', def);
			_.assign(ramlDef, annotationConverter._export(ramlDef));
			delete ramlDef.annotations;
		}
		for (const id in ramlDef) {
			if (!ramlDef.hasOwnProperty(id)) continue;

			if (typeof ramlDef[id] === 'object' && !_.isEmpty(ramlDef[id]))
				ramlDef[id] = RamlDefinitionConverter.exportExample(ramlDef[id], model, def);
		}

		return ramlDef;
	}

	_convertFromInternalType(ramlDef: any) {
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
			RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = 'byte';
		} else if (internalType === 'binary') {
			ramlDef.type = 'string';
			const id = this.annotationPrefix + '-format';
			RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = 'binary';
		} else if (internalType === 'password') {
			ramlDef.type = 'string';
			const id = this.annotationPrefix + '-format';
			RamlCustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = 'password';
		} else if (internalType === 'file') {
			ramlDef.type = 'file';
		} else if (internalType === 'dateonly') {
			ramlDef.type = 'date-only';
		} else if (internalType === 'datetime') {
			ramlDef.type = 'datetime';
		} else if (internalType === 'timeonly') {
			ramlDef.type = 'time-only';
		} else if (internalType === 'datetimeonly') {
			ramlDef.type = 'datetime-only';
		} else if (internalType === 'timestamp') {
			ramlDef.type = 'timestamp';
		} else if (internalType === 'object') {
			ramlDef.type = 'object';
		} else if (internalType === 'array') {
			ramlDef.type = 'array';
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

module.exports = RamlDefinitionConverter;
