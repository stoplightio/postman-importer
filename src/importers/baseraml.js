const
	Endpoint = require('../entities/endpoint'),
	Importer = require('./importer'),
	Project = require('../entities/project'),
	jsonHelper = require('../utils/json'),
	xmlHelper = require('../utils/xml'),
	ramlHelper = require('../helpers/raml'),
	Schema = require('../entities/schema'),
	url = require('url'),
	_ = require('lodash');

const toJSONOptions = {
	serializeMetadata: false
};

//TODO multi file support isn't justified
class RAMLImporter extends Importer {
	constructor() {
		super();
		this.schemas = [];
	}

	static getCustomProperty(propName) {
		return '__custom-' + propName;
	}

	// _getSecuritySchemeSettingsByName(schemeName) {
	// 	const securitySchemes = this.data.securitySchemes;
	// 	for (const i in securitySchemes) {
	// 		if (!securitySchemes.hasOwnProperty(i)) continue;
	//
	// 		const entries = _.entries(securitySchemes[i]);
	// 		for (let index = 0; index < entries.length; index++) {
	// 			const entry = entries[index];
	// 			const key = entry[0];
	// 			const value = entry[1];
	//
	// 			if (schemeName === key) {
	// 				return value;
	// 			}
	// 		}
	// 	}
	// }
	
	_mapSecuritySchemes(securitySchemes) {
		const slSecurityScheme = {};
		for (const i in securitySchemes) {
			if (!securitySchemes.hasOwnProperty(i)) continue;
			const securityScheme = securitySchemes[i];
			for (const name in securityScheme) {
				if (!securityScheme.hasOwnProperty(name)) continue;
				const scheme = securityScheme[name];
				switch (scheme.type) {
				case 'Pass Through' : {
					if (!slSecurityScheme['apiKey']) {
						slSecurityScheme['apiKey'] = [];
					}
					const apiKey = {
						name: name
					};
					if (scheme.describedBy) {
						if (scheme.describedBy.headers) {
							for (const index in scheme.describedBy.headers) {
								if (!scheme.describedBy.headers.hasOwnProperty(index)) continue;
								const current = scheme.describedBy.headers[index];
								apiKey.headers = [];
								apiKey.headers.push({
									name: current.name
								});
							}
						}
						if (scheme.describedBy.queryParameters) {
							for (const index in scheme.describedBy.queryParameters) {
								if (!scheme.describedBy.queryParameters.hasOwnProperty(index)) continue;
								const current = scheme.describedBy.queryParameters[index];
								apiKey.queryString = [];
								apiKey.queryString.push({
									name: current.name
								});
							}
						}
					}
					if (scheme.description) {
						apiKey.description = scheme.description;
					}
						
					slSecurityScheme['apiKey'].push(apiKey);
					break;
				}
				case 'OAuth 2.0': {
					if (!slSecurityScheme['oauth2']) {
						slSecurityScheme['oauth2'] = [];
					}
					let oauth = {
						name: name, //not used in stoplight designer
						authorizationUrl: scheme.settings.authorizationUri || '',
						tokenUrl: scheme.settings.accessTokenUri || '',
						scopes: []
					};
					if (Array.isArray(scheme.settings.scopes)) {
						for (const scopeIndex in scheme.settings.scopes) {
							if (!scheme.settings.scopes.hasOwnProperty(scopeIndex)) continue;
							oauth.scopes.push({
								name: scheme.settings.scopes[scopeIndex],
								value: ''
							});
						}
					}
						//authorizationGrants are flow, only one supported in stoplight
					const flow = !_.isEmpty(scheme.settings.authorizationGrants) ? scheme.settings.authorizationGrants[0] : 'code';
					oauth = this.mapAuthorizationGrants(oauth, flow);

					if (scheme.description) {
						oauth.description = scheme.description;
					}
					slSecurityScheme['oauth2'].push(oauth);
					break;
				}
				case 'Basic Authentication':
					if (!slSecurityScheme['basic']) {
						slSecurityScheme['basic'] = [];
					}
					slSecurityScheme['basic'].push({
						name: name,
						value: '',
						description: scheme.description || ''
					});
					break;
				default:
					//TODO not supported
				}
			}
		}
		return slSecurityScheme;
	}
	
	_mapRequestBody(methodBody, checkEmptyType) {
		return this.mapRequestBody(methodBody, checkEmptyType);
	}
	
	_mapHeadersParameters(queryParameters, traits) {
		return this._mapParameters(queryParameters, traits, 'headers');
	}
	
	_mapQueryParameters(queryParameters, traits) {
		return this._mapParameters(queryParameters, traits, 'queryParameters');
	}
	
	_mapParameters(queryParameters, traits, parameterName) {
		//avoid queryParameters from expand option.
		if (traits) {
			RAMLImporter._filterPropertiesFromTraits(queryParameters, traits, parameterName);
		}
		
		const queryString = {type: 'object', properties: {}, required: []};
		for (const key in queryParameters) {
			if (!queryParameters.hasOwnProperty(key)) continue;
			const qp = queryParameters[key];
			const parameterFields = ramlHelper.setParameterFields(qp, {});
			queryString.properties[key] = this.convertRefToModel(parameterFields, false);
			RAMLImporter._convertRequiredToArray(qp, key, queryString.required);
		}
		return queryString;
	}
	
	static _filterPropertiesFromTraits(params, traits, propertyName) {
		
		for (const i in traits) {
			if (!traits.hasOwnProperty(i)) continue;
			
			for (const j in traits[i]) {
				if (!traits[i].hasOwnProperty(j)) continue;
				const param = traits[i][j];
				if (param.hasOwnProperty(propertyName)) {
					
					for (const k in param[propertyName]) {
						if (!param[propertyName].hasOwnProperty(k)) continue;
						const p = param[propertyName][k];
						const isParametricTrait = RAMLImporter._isParametricTrait(p);
						const found = _.find(params, {name: p.name});
						if (found && !isParametricTrait) {
							delete params[k];
						}
					}
				}
			}
		}
	}

	static _isParametricTrait(trait) {
		let result = false;
		for (const id in trait) {
			if (!trait.hasOwnProperty(id)) continue;
			const prop = trait[id];

			if (typeof prop === 'object' && id !== 'required') {
				result = this._isParametricTrait(prop);
			} else {
				if (_.includes(prop, '<<') && _.includes(prop, '>>'))
					result = true;
				else if (typeof prop === 'number' && _.isNaN(prop))
					result = true;
			}
		}

		return result;
	}
	
	_mapQueryString(queryString) {
		const result = queryString;
		delete result.typePropertyKind;

		RAMLImporter._mapTypesFormats(queryString, false);
		
		if (queryString.properties) {
			queryString.required = [];
		}
		for (const paramId in queryString.properties) {
			if (!queryString.properties.hasOwnProperty(paramId)) continue;
			const param = queryString.properties[paramId];
			RAMLImporter._convertRequiredToArray(param, paramId, queryString.required);
		}
		
		return result;
	}
	
	_mapRequestHeaders(data, traits) {
		return this._mapHeadersParameters(data, traits);
	}
	
	_mapURIParams(uriParams, path) {
		const pathParams = {type: 'object', properties: {}, required: []};
		
		for (const i in uriParams) {
			if (!uriParams.hasOwnProperty(i)) continue;
			const key = uriParams[i];

			if (!_.includes(path, key.name)) continue;

			pathParams.properties[key.name] = {
				type: key.type || 'string'
			};
			const description = key.displayName || key.description;
			if (description) {
				pathParams.properties[key.name]['description'] = description;
			}
			RAMLImporter._convertRequiredToArray(key, key.name, pathParams.required);
			RAMLImporter._addAnnotations(key, pathParams.properties[key.name]);
		}
		return pathParams;
	}
	
	static _convertRequiredToArray(object, key, required) {
		if (!object.hasOwnProperty('required') || object.required === true) {
			required.push(key);
		}
		delete object.required;
	}
	
	static _mapTypesFormats(object, isSchema) {
		if (!object.hasOwnProperty('type') || object.type === 'object') return object;
		const type = _.isArray(object.type) && object.type.length === 1 ? object.type[0]: object.type;
		object.type = type;
		switch (type) {
		case 'date-only':
			object.type = 'string';
			object.format = 'date';
			break;
		case 'time-only':
			object.type = 'string';
			object[RAMLImporter.getCustomProperty('format')] = 'time-only';
			break;
		case 'datetime-only':
			object.type = 'string';
			object[RAMLImporter.getCustomProperty('format')] = 'datetime-only';
			break;
		case 'datetime':
			object.type = 'string';
			if (object.format === 'rfc3339' || !object.hasOwnProperty('format')) {
				object.format = 'date-time';
			} else {
				object[RAMLImporter.getCustomProperty('format')] = object.format;
				delete object.format;
			}
			break;
		case 'file':
			if (isSchema) {
				object.type = 'string';
				object[RAMLImporter.getCustomProperty('type')] = 'file';
			}
			if (object.hasOwnProperty('fileTypes')) {
				object[RAMLImporter.getCustomProperty('fileTypes')] = object['fileTypes'];
				delete object['fileTypes'];
			}
			break;
		default:
			if (typeof type === 'string' && (type.includes('|') || type.includes('?'))) {
				object.type = 'object';
			} else if (typeof type !== 'object' && ramlHelper.getRAML10ScalarTypes.indexOf(type) < 0) {
				object[RAMLImporter.getCustomProperty('type')] = type;
				object.type = 'string';
			}
			break;
		}
	}
	
	_mapResponseBody(responses) {
		const data = [];
		for (const code in responses) {
			if (!responses.hasOwnProperty(code)) continue;
			const response = responses[code];
			let result = {};

			if (response.hasOwnProperty('body') && !_.isEmpty(response.body)) {
				const mimeType = Object.keys(response.body)[0];
				if (response.body[mimeType].hasOwnProperty('displayName')) { //unnecessary property added after change to expand(true).
					delete response.body[mimeType]['displayName'];
				}
				result = this.mapRequestBody(response.body[mimeType], false, mimeType);
			}
			result.codes = [response.code];
			if (result.body) {
				result.body = jsonHelper.parse(jsonHelper.cleanSchema(result.body));
			}
			
			if (response.headers) {
				const r = {};
				for (const index in response.headers) {
					if (!response.headers.hasOwnProperty(index)) continue;
					let header = response.headers[index];
					if (!header.hasOwnProperty('type'))
						header.type = 'string';
					else
						RAMLImporter._mapTypesFormats(header, false);
					r[header.name] = this._mapQueryString(header);
					delete r[header.name]['name'];
					header = RAMLImporter._mapExamples(header);
					if (header.description && _.isEmpty(header.description)) header.description = '';
				}
				result.headers = r;
			}
			
			if (response.description) {
				result.description = _.isEmpty(response.description) ? '' : jsonHelper.stringify(response.description);
			}
			RAMLImporter._addAnnotations(response, result);
			data.push(result);
		}
		return data;
	}
	
	_mapSchemas(schemData) {
		//check if type attribute is abscent and fill with default value (type: string).
		RAMLImporter._checkForDefaultType(schemData);
		let schemas = [];
		let newSchemas = [];
		for (const index in schemData) {
			if (!schemData.hasOwnProperty(index)) continue;
			for (const schemaName in schemData[index]) {
				if (!schemData[index].hasOwnProperty(schemaName)) continue;
				const sd = new Schema(schemaName);
				sd.Name = schemaName;
				const schema = jsonHelper.parse(schemData[index][schemaName]);
				if (schema.hasOwnProperty('definitions')) {
					newSchemas = this.addDefinitions(schema,newSchemas);
				}
				sd.Definition = this._mapSchema(schemData[index][schemaName], true, false);

				schemas.push(sd);
			}
		}
		if (!_.isEmpty(newSchemas)) {
			schemas = _.concat(schemas, this._mapSchemas(newSchemas));
		}
		return schemas;
	}


	addDefinitions(schema, schemas) {
		const definitions = schema.definitions;
		if (!schemas) schemas = [];
		for (const def in definitions) {
			if (!definitions.hasOwnProperty(def)) continue;
			let newSchema = {};
			newSchema[def] = jsonHelper.stringify(definitions[def]);
			const schemaNames = schemas.map(function(a) { return Object.keys(a)[0]; });
			if (!_.includes(schemaNames, def))
				schemas.push(newSchema);
		}
		delete schema.definitions;
		return schemas;
	}
	
	static _checkForDefaultType(schemas) {
		for (const index in schemas) {
			if (!schemas.hasOwnProperty(index)) continue;
			
			for (const id in schemas[index]) {
				if (!schemas[index].hasOwnProperty(id)) continue;
				const schema = schemas[index][id];
				RAMLImporter._fillDefaultType(schema);
			}
		}
	}
	
	static _fillDefaultType(object) {
		if (object.properties) {
			for (const id in object.properties) {
				if (!object.properties.hasOwnProperty(id)) continue;
				const current = object.properties[id];
				RAMLImporter._fillDefaultType(current);
			}
		} else {
			if (typeof object === 'object' && !object.hasOwnProperty('type') && !object.hasOwnProperty('schema')) {
				object.type = ['string'];
			}
		}
	}
	
	isValidRefValues(values) {
		if (!_.isArray(values)) {
			return this.isValidRefValue(values);
		}
		let result = true;
		for (let index = 0; index < values.length && result === true; index++) {
			result = this.isValidRefValue(values[index]);
		}
		
		return result;
	}
	
	isValidRefValue(value) {
		return typeof value === 'string' && this.isDefinedAsSchema(this.getSchemas(this.data), value);
	}
	
	// from type=type1 & schema=type1 to ref=type1
	convertRefToModel(object, isSchema, isProperty) {
		if (jsonHelper.isJson(object)) {
			return object;
		}
		// if the object is a string, that means it's a direct ref/type
		if (typeof object === 'string') {
			if (this.isValidRefValue(object)) {
				return {
					$ref: '#/definitions/' + object
				};
			} else {
				return object;
			}
		}
		
		delete object.typePropertyKind;
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;

			let val = object[id];
			if (!val) continue;
			if (id === 'type') {
				if (_.isArray(object[id]) && object[id].length === 1) object[id] = object[id][0];
				val = object[id];
				if (val !== 'object' && typeof val === 'string' && !xmlHelper.isXml(val)) {
					object[id] = RAMLImporter._modifyUnionType(val);
					val = object[id];
				}
				if (jsonHelper.isJson(val)) {
					object = val;
					delete object[id];
				} else if (xmlHelper.isXml(val)) {
					object.type = 'object';
				} else if (this.isValidRefValues(val)) {
					object.ref = val;
					delete object[id];
				}
				if (!isProperty) {
					RAMLImporter._mapTypesFormats(object, isSchema);
				}
			}
			if (id === 'example' || id === 'examples') {
				object = RAMLImporter._mapExamples(object);
			} else if (typeof val === 'object') {
				if (id === 'items' && !val.hasOwnProperty('type') && !val.hasOwnProperty('properties')) {
					if (!_.isArray(val)) val.type = 'string';
					else {
						object.items = {
							ref: val[0]
						};
						return object;
					}
				}
				if (id === 'fixedFacets') { //delete garbage
					delete object[id];
				} else {
					if (id === 'xml') { //no process xml object
						object[id] = val;
					} else {
						object[id] = this.convertRefToModel(val, isSchema, id === 'properties' && !isProperty);
					}
				}
			} else if (id === 'name') { //delete garbage
				delete object[id];
			}
		}
		
		return object;
	}
	
	static _modifyUnionType(type) {
		if (type.includes('|') || type.includes('?'))
			type = 'object';
		
		return type;
	}
	
	static mapMimeTypes(body, skip) {
		const result = [];
		const skipMimeTypes = [];
		for (const i in skip) {
			if (!skip.hasOwnProperty(i)) continue;
			
			if (skip[i].value) {
				skipMimeTypes.push(skip[i].value);
			}
		}
		
		for (const i in body) {
			if (!body.hasOwnProperty(i)) continue;
			
			const b = body[i];
			if (b.name) {
				const mimeType = b.name;
				if (skipMimeTypes.indexOf(mimeType) === -1) {
					result.push(mimeType);
				}
			}
		}
		return _.uniq(result);
	}
	
	_mapEndpoint(project, resource, baseURI, pathParams) {
		let resultParams = JSON.parse(JSON.stringify(pathParams));
		const path = baseURI + resource.relativeUri;
		if (resource.uriParameters) {
			if(_.isEmpty(resultParams))
				resultParams = this._mapURIParams(resource.uriParameters, path);
			else{
				let newParams = this._mapURIParams(resource.uriParameters, path);
				_.merge(resultParams.properties, newParams.properties);
				resultParams.required = _.concat(resultParams.required, newParams.required);
			}
		}
		
		const mResource = {
			path: path,
			endpoints: [],
			annotations: {}
		};
		
		if (resource.hasOwnProperty('is')) {
			mResource.is = resource.is;
		}
		
		if (resource.displayName) {
			mResource.displayName = resource.displayName;
		}
		
		if (resource.description) {
			mResource.description = resource.description;
		}
		
		RAMLImporter._addAnnotations(resource, mResource.annotations);
		
		const methods = resource.methods;
		for (const i in methods) {
			if (!methods.hasOwnProperty(i)) continue;
			const method = methods[i];
			
			const summary = method.summary ? method.summary : '';
			const endpoint = new Endpoint(summary);
			endpoint.Method = method.method;
			endpoint.Path = baseURI + resource.relativeUri;
			endpoint.Description = method.description ? jsonHelper.stringify(method.description) : '';
			
			endpoint.SetOperationId(method.displayName, endpoint.Method, endpoint.Path);
			
			if (method.body) {
				const c = RAMLImporter.mapMimeTypes(method.body, this.data.mediaType);
				endpoint.Consumes = c.length > 0 ? c : null;
				this.mapRequestBodies(endpoint, method.body, true);
			}
			
			if (method.queryParameters) {
				endpoint.QueryString = this._mapQueryParameters(method.queryParameters, this.data.traits);
			} else if (method.queryString) {
				endpoint.QueryString = this._mapQueryString(method.queryString);
			}
			
			if (method.headers) {
				endpoint.Headers = this._mapRequestHeaders(method.headers, this.data.traits);
			}
			
			if (method.responses) {
				let produces = [];
				for (const code in method.responses) {
					if (!method.responses.hasOwnProperty(code)) continue;
					
					if (!method.responses[code] || !method.responses[code].body) {
						continue;
					}
					produces = produces.concat(RAMLImporter.mapMimeTypes(method.responses[code].body, this.data.mediaType));
				}
				const p = _.uniq(produces);
				endpoint.Produces = p.length > 0 ? p : null;
				endpoint.Responses = this._mapResponseBody(method.responses);
			}
			
			endpoint.traits = [];
			const isMethod = _.union(resource.is, method.is);

			if (isMethod) {
				if (isMethod instanceof Array) {
					endpoint.traits = isMethod;
				} else if (isMethod instanceof Object) {
					endpoint.traits = Object.keys(isMethod);
				}
			}
			if (method.hasOwnProperty('is')) {
				endpoint.is = method.is;
			}
			
			endpoint.PathParams = resultParams;
			
			//endpoint security
			const securedBy = method.securedBy;
			if (Array.isArray(securedBy)) {
				endpoint.securedBy = [];
				for (const si in securedBy) {
					if (!securedBy.hasOwnProperty(si)) continue;
					
					if (typeof securedBy[si] === 'string') {
						endpoint.securedBy.push(securedBy[si]);
					}
					else {
						for (const index in securedBy[si]) {
							if (!securedBy[si].hasOwnProperty(index)) continue;
							const current = securedBy[si][index];
							if (current.scopes) {
								const elem = {};
								elem[index] = current.scopes;
								endpoint.securedBy.push(elem);
							} else {
								endpoint.securedBy.push(index);
							}
						}
					}
				}
			}
			
			//add annotations
			RAMLImporter._addAnnotations(method, endpoint);
			
			//TODO endpoint security
			mResource.endpoints.push(endpoint);
		}
		project.addResource(mResource);
		
		const resources = resource.resources;
		if (resources && resources.length > 0) {
			for (let j = 0; j < resources.length; j++) {
				this._mapEndpoint(project, resources[j], baseURI + resource.relativeUri, resultParams);
			}
		}
	}
	
	loadFile(filePath, options) {
		return new Promise((resolve, reject) => {
			const parser = require('raml-1-parser');
			parser.loadApi(filePath, RAMLImporter._options(options)).then((api) => {
				try {
					this.data = api.expand(true).toJSON(toJSONOptions);
					resolve();
				}
				catch (e) {
					reject(e);
				}
			}, e => {
        reject(e);
			});
		});
	}

	loadData(data, options) {
		return new Promise((resolve, reject) => {
			try {
				const parser = require('raml-1-parser');
				const parsedData = parser.parseRAMLSync(data, RAMLImporter._options(options));
				if (parsedData.name === 'Error') {
					reject(parsedData /* error */);
				} else {
					this.data = parsedData.expand(true).toJSON(toJSONOptions);
					resolve();
				}
			} catch (e) {
				reject(e);
			}
		});
	}

	static _options(options) {
		const validate = options && (options.validate === true || options.validateImport === true);
		const parseOptions = {
			attributeDefaults: false,
			rejectOnErrors: validate
		};
		return !options ? parseOptions : _.merge(parseOptions, options);
	}

	_mapHost(project) {
		const parsedURL = url.parse(this.data.baseUri || '');
		project.Environment.Host = (parsedURL.protocol && parsedURL.host) ? (parsedURL.protocol + '//' + parsedURL.host) : null;
		project.Environment.BasePath = parsedURL.path;
	}

	_mapTraits(traitGroups, parametric) {
		const slTraits = [];
		
		for (const i in traitGroups) {
			if (!traitGroups.hasOwnProperty(i)) continue;
			const traitGroup = traitGroups[i];
			
			for (const k in traitGroup) {
				if (!traitGroup.hasOwnProperty(k)) continue;
				const trait = traitGroup[k];
				const slTrait = {
					_id: k,
					name: k,
					description: '',
					request: {},
					responses: []
				};
				
				if (!_.isEmpty(trait.usage)) {
					slTrait.description = jsonHelper.stringify(trait.usage);
				} else {
					delete slTrait.description;
				}
				
				if (trait.queryParameters) {
					const queryString = RAMLImporter._filterParametricTraits(this._mapQueryParameters(trait.queryParameters), parametric);
					if (!_.isEmpty(queryString.properties))
						slTrait.request.queryString = queryString;
				}
				
				if (trait.headers) {
					const headers = RAMLImporter._filterParametricTraits(this._mapRequestHeaders(trait.headers), parametric);
					if (!_.isEmpty(headers.properties))
						slTrait.request.headers = headers;
				}
				
				if (trait.responses) {
					slTrait.responses = this._mapResponseBody(trait.responses);
				} else {
					delete slTrait.responses;
				}
				
				slTraits.push(slTrait);
				
			}
		}
		
		return slTraits;
	}

	static _filterParametricTraits(traits, parametric) {
		const result = {
			properties: {},
			required: []
		};
		for (const id in traits.properties) {
			if (!traits.properties.hasOwnProperty(id)) continue;

			const trait = traits.properties[id];
			const isParametric = RAMLImporter._isParametricTrait(trait);
			if (isParametric && !parametric) continue;
			if (!isParametric && parametric) continue;
			result.properties[id] = trait;
			if (_.indexOf(traits.required, id) >= 0) {
				result.required.push(id);
			}
		}
		return result;
	}
	
	static _addAnnotations(source, target) {
		if (!source.annotations) return;
		
		const annotations = source.annotations;
		for (const i in annotations) {
			if (!annotations.hasOwnProperty(i)) continue;
			if (_.startsWith(i, 'oas-')) continue;
			const value = annotations[i];
			const key = 'x-annotation-' + i;
			target[key] = value.structuredValue || '';
		}
		
		if (target.annotations) delete target.annotations;
	}
	
	static _mapExamples(object) {
		if (object.hasOwnProperty('example')) {
			let example = object.example;
			if (object.hasOwnProperty('structuredExample')) {
				example = object.structuredExample;
				delete object.structuredExample;
			}
			if (example.hasOwnProperty('structuredValue')) {
				object.example = example.structuredValue;
			} else if (example.hasOwnProperty('value')) {
				object.example = JSON.parse(example.value);
			}
			if (example.hasOwnProperty('strict') && !example.strict) {
				object.example.strict = false;
			}
			if (example.hasOwnProperty('name') && example.name) {
				object.example[RAMLImporter.getCustomProperty('example-name')] = example.name;
			}
		} else if (object.hasOwnProperty('examples')){
			const examples = object.examples;
			for (const id in examples) {
				if (!examples.hasOwnProperty(id))continue;
				const example = examples[id];
				if (example.hasOwnProperty('structuredValue')) {
					object.examples[id] = example.structuredValue;
				} else if (example.hasOwnProperty('value')) {
					object.examples[id] = JSON.parse(example.value);
				}
				if (example.hasOwnProperty('strict') && !example.strict) {
					object.examples[id].strict = false;
				}
				if (example.hasOwnProperty('name') && example.name) {
					object.examples[id][RAMLImporter.getCustomProperty('example-name')] = example.name;
				}
			}
		}
		
		return object;
	}
	
	_import() {
		try {
			const project = new Project(this.data.title);
			project.Environment.Version = this.data.version;
			if (!project.Environment.Version) {
				delete project.Environment.Version;
			}
			
			// TODO set project description from documentation
			// How to know which documentation describes the project briefly?
			this.description(project, this.data);
			
			this._mapHost(project);
			
			if (!_.isEmpty(this.data.protocols)) {
				project.Environment.Protocols = this.data.protocols;
				for (const i in project.Environment.Protocols) {
					if (!project.Environment.Protocols.hasOwnProperty(i)) continue;
					project.Environment.Protocols[i] = project.Environment.Protocols[i].toLowerCase();
				}
			}
			
			const mimeTypes = [];
			let mediaType = this.data.mediaType;
			if (mediaType) {
				if (!_.isArray(mediaType)) {
					mediaType = [mediaType];
				}
				for (const i in mediaType) {
					if (!mediaType.hasOwnProperty(i)) continue;
					if (mediaType[i]) {
						mimeTypes.push(mediaType[i]);
					}
				}
			}
			if (mimeTypes.length) {
				project.Environment.Produces = mimeTypes;
				project.Environment.Consumes = mimeTypes;
			}
			
			project.Environment.SecuritySchemes = this._mapSecuritySchemes(this.data.securitySchemes);

			const resources = this.data.resources;
			if (!_.isEmpty(resources)) {
				for (let i = 0; i < resources.length; i++) {
					this._mapEndpoint(project, resources[i], '', {});
				}
			}
			
			const schemas = this._mapSchemas(this.getSchemas(this.data));
			for (const s in schemas) {
				if (!schemas.hasOwnProperty(s)) continue;
				project.addSchema(schemas[s]);
			}
			
			project.traits = this._mapTraits(this.data.traits, false);
			project.parametricTraits = this._mapTraits(this.data.traits, true);
			project.uses = this.data.uses;
			RAMLImporter._addAnnotations(this.data, project);
			return project;
		} catch (e) {
			console.error('raml#import', e);
			throw e;
		}
	}
	
	mapRequestBodies(endpoint, methodBodies, checkEmptyType) {
		for (const mimeType in methodBodies) {
			if (!methodBodies.hasOwnProperty(mimeType)) continue;
			const methodBody = methodBodies[mimeType];
			
			endpoint.Body = this.mapRequestBody(methodBody, checkEmptyType, mimeType);
		}
	}
	
	//noinspection JSMethodCanBeStatic
	description() {
		throw new Error('description method not implemented');
	}
	
	//noinspection JSMethodCanBeStatic
	mapRequestBody() {
		throw new Error('mapRequestBody method not implemented');
	}
	
	//noinspection JSMethodCanBeStatic
	_mapSchema() {
		throw new Error('mapSchema method not implemented');
	}
	
	//noinspection JSMethodCanBeStatic
	getSchemas() {
		throw new Error('getSchema method not implemented');
	}

	//noinspection JSMethodCanBeStatic
	mapAuthorizationGrants() {
		throw new Error('convertAuthorizationGrants method not implemented');
	}

	isDefinedAsSchema() {
		throw new Error('isDefinedAsSchema method not implemented');
	}
}

module.exports = RAMLImporter;
