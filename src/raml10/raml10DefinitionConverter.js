// @flow
const _ = require('lodash');
const Definition = require('../model/definition');
const Root = require('../model/root');
const Annotation = require('../model/annotation');
const Converter = require('../model/converter');
const helper = require('../helpers/converter');
const jsonHelper = require('../utils/json');
const arrayHelper = require('../utils/array');
const ramlHelper = require('../helpers/raml');
const stringHelper = require('../utils/strings');
const xmlHelper = require('../utils/xml');
const Raml10RootConverter = require('../raml10/raml10RootConverter'); // eslint-disable-line no-unused-vars,FIXME
const Raml10AnnotationConverter = require('../raml10/raml10AnnotationConverter');
const Raml10CustomAnnotationConverter = require('../raml10/raml10CustomAnnotationConverter');

class Raml10DefinitionConverter extends Converter {

	export(models:any) {
		const result = {};
		this.level = 'type';

		for (const id in models) {
			if (!models.hasOwnProperty(id)) continue;
			
			const model: Definition = models[id];
			const name = stringHelper.checkAndReplaceInvalidChars(id, ramlHelper.getValidCharacters, ramlHelper.getReplacementCharacter);
			result[name] = this._export(model);
			if (id !== name) {
				const annotationName = this.annotationPrefix + '-definition-name';
				Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, annotationName);
				result[name]['(' + annotationName + ')'] = id;
			}
		}

		return result;
	}

	_export(model:Definition) {
		if (model.hasOwnProperty('jsonValue')) {
			return model.jsonValue;
		}

		const attrIdMap = {
			'_enum': 'enum',
			'_default': 'default'
		};

		const attrIdSkip = ['name', 'type', 'reference', 'properties', 'items', 'compositionType', 'in', 'schema', 'additionalProperties', 'title', 'items', 'itemsList',
			'exclusiveMaximum', 'exclusiveMinimum', 'readOnly', 'externalDocs', '$schema', 'annotations', 'collectionFormat', 'allowEmptyValue', 'fileReference', '_enum'];

		const ramlDef = Raml10DefinitionConverter.createRamlDef(model, attrIdMap, attrIdSkip);

		if (model.hasOwnProperty('type')) {
			if (typeof model.type === 'object' && model.type) {
				const type: Definition = model.type;
				ramlDef.type = _.isArray(type) ? type : this._export(type);
			} else {
				ramlDef.type = model.type;
				if (model.hasOwnProperty('format')) {
					const id = this.annotationPrefix + '-format';
					Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
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
		
		if (ramlDef.type !== 'string') {
			if (ramlDef.hasOwnProperty('minLength')) delete ramlDef.minLength;
			if (ramlDef.hasOwnProperty('maxLength')) delete ramlDef.maxLength;
		}

		if (model.hasOwnProperty('items')) {
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
		
		if (model.hasOwnProperty('itemsList')) {
			const itemsList: Definition[] = model.itemsList;
			const items = [];
			for (let i = 0; i < itemsList.length; i++) {
				const def: Definition = itemsList[i];
				items.push(this._export(def));
			}
			ramlDef.items = items;
		}

		if (model.hasOwnProperty('reference')) {
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

		if (model.hasOwnProperty('_enum')) {
			const enumModel: string[] = model._enum;
			const isDateOnly: boolean = ramlDef.type === 'date-only';
			const _enum: string[] = [];
			for (let i = 0; i < enumModel.length; i++) {
				const item: string = enumModel[i];
				_enum.push(isDateOnly ? item.replace('_', '-').replace('_', '-') : item);
			}
			ramlDef.enum = _enum;
		}
		
		if (model.hasOwnProperty('properties')) {
			const ramlProps = {};
			for (const id in model.properties) {
				if (!model.properties.hasOwnProperty(id)) continue;
				
				const value: any = model.properties[id];
				ramlProps[id] = this._export(value);
				
				if (!model.hasOwnProperty('propsRequired')) {
					ramlProps[id].required = false;
				} else if (model.hasOwnProperty('propsRequired')) {
					if (_.isEmpty(model.propsRequired) || model.propsRequired.indexOf(id) < 0) ramlProps[id].required = false;
				}
			}

			if (!_.isEmpty(ramlProps)) ramlDef.properties = ramlProps;
			delete ramlDef.propsRequired;
		}

		if (model.hasOwnProperty('compositionType')) {
			const result = {};
			for (let i = 0; i < model.compositionType.length; i++) {
				const value: Definition = model.compositionType[i];
				const val = this._export(value);
				if (val && typeof val === 'object') {
					if (val.hasOwnProperty('properties')) {
						delete val.type;
						_.merge(result, val);
					} else if (result.hasOwnProperty('type') && val.hasOwnProperty('type')) {
						result.type = [result.type, val.type];
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
		
		if (model.hasOwnProperty('schema')) {
			const schema: Definition = model.schema;
			ramlDef.schema = this._export(schema);
		}

		if (model.hasOwnProperty('additionalProperties')) {
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
					ramlDef['example'] = Raml10DefinitionConverter.exportExample(example, this.model, this.def);
					if (this.level === 'type' && !ramlDef.hasOwnProperty('type') && !ramlDef.hasOwnProperty('properties')) ramlDef.type = 'object';
				} else {
					if (_.isNumber(example) && ramlDef.type === 'string') example = example.toString();
					ramlDef['example'] = example;
				}
			}
		}

		if (model.hasOwnProperty('exclusiveMaximum')) {
			const id = this.annotationPrefix + '-exclusiveMaximum';
			Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.exclusiveMaximum;
		}
		if (model.hasOwnProperty('exclusiveMinimum')) {
			const id = this.annotationPrefix + '-exclusiveMinimum';
			Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.exclusiveMinimum;
		}
		if (model.hasOwnProperty('title')) {
			const id = this.annotationPrefix + '-schema-title';
			Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.title;
		}
		if (model.hasOwnProperty('readOnly')) {
			const id = this.annotationPrefix + '-readOnly';
			Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.readOnly;
		}
		if (model.hasOwnProperty('collectionFormat')) {
			const id = this.annotationPrefix + '-collectionFormat';
			Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.collectionFormat;
		}
		if (model.hasOwnProperty('allowEmptyValue')) {
			const id = this.annotationPrefix + '-allowEmptyValue';
			Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.allowEmptyValue;
		}
		if (model.hasOwnProperty('externalDocs')) {
			const id = this.annotationPrefix + '-externalDocs';
			Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = model.externalDocs;
		}
		if (ramlDef.hasOwnProperty('maximum') && ramlDef.hasOwnProperty('type') && scalarNumberTypes.indexOf(ramlDef.type) < 0) {
			const id = this.annotationPrefix + '-maximum';
			Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = ramlDef.maximum;
			delete ramlDef.maximum;
		}
		if (ramlDef.hasOwnProperty('minimum') && ramlDef.hasOwnProperty('type') && scalarNumberTypes.indexOf(ramlDef.type) < 0) {
			const id = this.annotationPrefix + '-minimum';
			Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = ramlDef.minimum;
			delete ramlDef.minimum;
		}
		if (model.hasOwnProperty('annotations') && _.isArray(model.annotations) && !_.isEmpty(model.annotations)) {
			const annotationConverter = new Raml10AnnotationConverter(this.model, this.annotationPrefix, this.def);
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

	import(ramlDefs:any) {
		const result = {};
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
	
	importRAML08(ramlDefs:any) {
		const result = {};
		if (_.isEmpty(ramlDefs)) return result;
		
		if (_.isArray(ramlDefs) && !_.isEmpty(ramlDefs)) {
			for (const id in ramlDefs) {
				if (!ramlDefs.hasOwnProperty(id)) continue;
				
				const value = ramlDefs[id];
				const name = _.keys(value)[0];
				if (_.keys(this.types).includes(name)) continue;
				let schema = helper.isJson(value[name]) ? JSON.parse(value[name]) : value[name];
				if (schema.hasOwnProperty('definitions')) {
					_.assign(result, (this.importRAML08(Raml10DefinitionConverter._convertMapToArray(schema.definitions))));
					delete schema.definitions;
				}
				if (xmlHelper.isXml(schema)) schema = { type: schema };
				result[name] = this._import(schema);
			}
		}
		this.types = result;
		
		return result;
	}

	_import(ramlDef:any) {
		const attrIdMap = {
			'displayName': 'title',
			'default': '_default'
		};

		Raml10DefinitionConverter._convertAnnotations(ramlDef);

		const attrIdCopyRaml = ['title', 'format', 'maxLength', 'minLength', 'exclusiveMaximum', 'exclusiveMinimum', 'maximum', 'minimum', 'definitions', 'minProperties', 'maxProperties', 'minItems', 'maxItems', 'default', 'uniqueItems'];
		const attrIdCopyRaml10= _.concat(attrIdCopyRaml, ['name', 'discriminator', 'multipleOf', 'pattern', 'displayName', 'default', 'schemaPath', 'required', 'xml', 'additionalProperties', 'minItems', 'maxItems', 'annotations', 'allowedTargets', '$ref', 'minProperties', 'maxProperties']);
		const attrIdCopyRaml08 = _.concat(attrIdCopyRaml, ['pattern', 'additionalProperties']);
		const jsonType = ramlDef.hasOwnProperty('typePropertyKind') ? ramlDef.typePropertyKind === 'JSON' : false;
		const inplaceType = ramlDef.hasOwnProperty('typePropertyKind') ? ramlDef.typePropertyKind === 'INPLACE' : (ramlDef.hasOwnProperty('type') && typeof ramlDef.type === 'object' && !_.isArray(ramlDef.type));
		const isRaml08Version = ramlHelper.isRaml08Version(this.version);

		if (isRaml08Version && typeof ramlDef === 'string') ramlDef = { type: ramlDef };
		
		if (inplaceType) {
			let value;
			if (ramlDef.hasOwnProperty('type')) {
				value = jsonHelper.parse(Raml10DefinitionConverter._readTypeAttribute(ramlDef.type));
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
				value = Raml10DefinitionConverter._readTypeAttribute(ramlDef.schema);
				_.assign(ramlDef, jsonHelper.parse(value));
				delete ramlDef.schema;
			}
		}

		const model: Definition = isRaml08Version ? Raml10DefinitionConverter.createDefinition(ramlDef, attrIdMap, attrIdCopyRaml08) : Raml10DefinitionConverter.createDefinition(ramlDef, attrIdMap, attrIdCopyRaml10);

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
			model.jsonValue = Raml10DefinitionConverter._readTypeAttribute(ramlDef.type);
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
						ramlDef.items = { type: 'string' };
					}
					// TODO: check lrg cases
					/*if (ramlDef.type === 'array') {
						for (const id in model) {
							if (!model.hasOwnProperty(id)) continue;
							
							if (id != 'items' && _.isArray(model[id])) delete model[id];
						}
					}*/
				}
				const value = Raml10DefinitionConverter._readTypeAttribute(ramlDef.type);
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
					} else {
						this._convertSimpleType(value, model);
					}
				}
			} else {
				//default type is string
				if (!ramlDef.hasOwnProperty('properties') && !ramlDef.hasOwnProperty('$ref'))
					model.type = 'string';
			}

			Raml10DefinitionConverter._convertToInternalType(model);
		}

		if (ramlDef.hasOwnProperty('properties')) {
			const required: string[] = ramlDef.hasOwnProperty('required') && _.isArray(ramlDef.required) ? ramlDef.required.filter(function (req) { return Object.keys(ramlDef.properties).includes(req); }) : [];
			const ignoreRequired = !_.isEmpty(required);

			const modelProps = {};
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
						value.map( v => {val.type.push(Raml10DefinitionConverter._readTypeAttribute(v.type));});
						value = val;
					}

					modelProps[id] = this._import(value);
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
			const value = Raml10DefinitionConverter._readTypeAttribute(ramlDef.items);
			if (typeof value === 'string') {
				const modelItems = new Definition();
				if (value.endsWith('[]')) {
					modelItems.type = 'array';
					const def = new Definition();
					this._convertSimpleType(value.replace('[]', ''), def);
					Raml10DefinitionConverter._convertToInternalType(def);
					modelItems.items = def;
				} else {
					this._convertSimpleType(value, modelItems);
					Raml10DefinitionConverter._convertToInternalType(modelItems);
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
				const items = Raml10DefinitionConverter._readTypeAttribute(ramlDef.items);
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
				const annotationConverter = new Raml10AnnotationConverter();
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
					example = { value: model.example, strict: ramlDef.structuredExample.strict };
			}
			model.example = example;
		}

		if (ramlDef.hasOwnProperty('enum') && ramlDef.type !== 'boolean') {
			model._enum = ramlDef.enum;
		}

		if (model.hasOwnProperty('required') && !model.hasOwnProperty('properties') && _.isArray(model.required)) {
			delete model.required;
		}

		return model;
	}

	_convertSimpleType(entry:string, model:any) {
		if (typeof entry !== 'string' || entry === undefined) return;
		// const val = (entry.indexOf('|') >= 0) ? 'object' : (_.endsWith(entry, '?') ? entry.substring(0, entry.length - 1) : entry);
		// if (raml10BuiltinTypes.indexOf(val) < 0)
		// 	model.reference = val;
		// else
		// 	model.type = val;
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
				if (isRaml08Version && this.def && this.def.schemas && !this.def.schemas.map(schema => { return _.keys(schema)[0]; }).includes(val))
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
		const annotations: Annotation[] = annotationConverter._import(ramlDef);
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
		if (type === 'any') model.internalType = 'string';
		if (type === 'date') model.internalType = 'datetime';
		if (type === 'time-only') model.internalType = 'timeonly';
		if (type === 'datetime' && (format === 'rfc3339' || !format)) model.internalType = 'datetime';
		if (type === 'datetime' && format && format !== 'rfc3339') model.internalType = 'string';
		if (type === 'datetime-only') model.internalType = 'datetimeonly';
		if (type === 'date-only') model.internalType = 'dateonly';
		if (type === 'file') model.internalType = 'file';
		if (type === 'null') model.internalType = 'null';
		if (type === 'timestamp') model.internalType = 'timestamp';
		if (type === 'object') model.internalType = 'object';
		if (type === 'array') model.internalType = 'array';

		if (model.hasOwnProperty('internalType')) {
			delete model.type;
			delete model.format;
		}
	}

	static exportExample(example:any, model:Root, def:any) {
		let ramlDef = example;
		if (ramlDef.hasOwnProperty('annotations')) {
			const annotationConverter = new Raml10AnnotationConverter(model, '', def);
			_.assign(ramlDef, annotationConverter._export(ramlDef));
			delete ramlDef.annotations;
		}
		for (const id in ramlDef) {
			if (!ramlDef.hasOwnProperty(id)) continue;

			if (typeof ramlDef[id] === 'object' && !_.isEmpty(ramlDef[id]))
				ramlDef[id] = Raml10DefinitionConverter.exportExample(ramlDef[id], model, def);
		}

		return ramlDef;
	}

	_convertFromInternalType(ramlDef:any) {
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
			Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = 'byte';
		} else if (internalType === 'binary') {
			ramlDef.type = 'string';
			const id = this.annotationPrefix + '-format';
			Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
			ramlDef['(' + id + ')'] = 'binary';
		} else if (internalType === 'password') {
			ramlDef.type = 'string';
			const id = this.annotationPrefix + '-format';
			Raml10CustomAnnotationConverter._createAnnotationType(this.def, this.annotationPrefix, id);
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
const numberValidFormats = _.concat(integerValidFormats, ['long', 'float', 'double']); // eslint-disable-line no-unused-vars,FIXME
const raml10BuiltinTypes = _.concat(scalarTypes, ['any', 'array', 'object', 'union']);
const raml08BuiltinTypes = _.concat(raml10BuiltinTypes, ['date']);

module.exports = Raml10DefinitionConverter;
