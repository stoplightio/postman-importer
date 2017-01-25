const fs = require('fs'),
	Endpoint = require('../entities/endpoint'),
	SavedEntry = require('../entities/savedEntry'),
	Importer = require('./importer'),
	Project = require('../entities/project'),
	urlHelper = require('../utils/url'),
	jsonHelper = require('../utils/json'),
	arrayHelper = require('../utils/array'),
	_ = require('lodash');

class Postman extends Importer {
	constructor() {
		super();
	}
	
	static transformVariableFormat(val) {
		if (!val) return null;
		return val.replace(/\{\{(.*)\}\}/i, '<<$1>>');
	}
	
	static parseQuery(qstr) {
		const query = {};
		if (qstr && qstr.length > 0) {
			const a = qstr.split('&');
			for (const i in a) {
				if (!a.hasOwnProperty(i)) continue;
				
				const b = a[i].split('=');
				if (!Array.isArray(b) || b.length <= 0)continue;
				query[decodeURIComponent(b[0])] = {
					type: 'string',
					default: Postman.transformVariableFormat(decodeURIComponent(b[1] || ''))
				};
			}
		}
		
		return {type: 'object', properties: query, required: []};
	}
	
	_mapURIParams(data) {
		const pathParams = {};
		for (const key in data) {
			if (!data.hasOwnProperty(key)) continue;
			
			pathParams[key] = Postman.transformVariableFormat(data[key]);
		}
		return pathParams;
	}
	
	_mapRequestHeaders(data) {
		const headerObj = {type: 'object', properties: {}, required: []};
		const headers = data.split('\n');
		for (const j in headers) {
			if (!headers.hasOwnProperty(j)) continue;
			
			const header = headers[j];
			if (!header) {
				continue;
			}
			const keyValueParts = header.split(':');
			headerObj['properties'][keyValueParts[0]] = {
				type: 'string',
				default: Postman.transformVariableFormat(keyValueParts[1])
			};
		}
		return headerObj;
	}
	
	_mapRequestBody(requestData) {
		const data = {body: {type: 'object', properties: {}, required: []}};
		
		for (const j in requestData) {
			if (!requestData.hasOwnProperty(j)) continue;
			
			let type = null;
			switch (requestData[j].type) {
				case 'text':
					type = 'string';
					break;
				default:
					type = 'binary';
			}
			data.body.properties[requestData[j].key] = {
				'type': type,
				'default': Postman.transformVariableFormat(requestData[j].value)
			};
		}
		return data;
	}
	
	static mapConsumes(mode) {
		const consumes = [];
		switch (mode) {
			case 'urlencoded':
				consumes.push('application/x-www-form-urlencoded');
				break;
			case 'params':
				//check for best suitability
				consumes.push('multipart/form-data');
				break;
			default:
				consumes.push('text/plain');
				break;
		}
		
		return consumes;
	}
	
	_mapEndpoint(pmr) {
		const endpoint = new Endpoint(pmr.name);
		const urlParts = pmr.url.split('?');
		endpoint.Id = pmr.id;
		endpoint.QueryString = Postman.parseQuery(urlParts[1]);
		endpoint.Path = Postman.transformVariableFormat(urlParts[0]);
		endpoint.Method = pmr.method;
		
		endpoint.Before = pmr.preRequestScript;
		
		endpoint.PathParams = this._mapURIParams(pmr.pathVariables);
		
		//parse headers
		endpoint.Headers = this._mapRequestHeaders(pmr.headers);
		//TODO map Body
		endpoint.Consumes = Postman.mapConsumes(pmr.dataMode);
		endpoint.Body = this._mapRequestBody(pmr.data);
		return endpoint;
	}
	
	static mapEndpointGroup(folder) {
		return {
			name: folder.name,
			items: folder.order
		};
	}
	
	loadData(data) {
		const me = this;
		return new Promise(function (resolve, reject) {
			me._parseData(data, function (err) {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}
	
	_parseData(data, cb) {
		try {
			this.data = JSON.parse(data);
			cb();
		}
		catch (err) {
			cb(err);
		}
	}
	
	loadFile(filePath, cb) {
		const me = this;
		
		if (urlHelper.isURL(filePath)) {
			urlHelper.get(filePath)
				.then((body) => {
					me._parseData(body, cb);
				})
				.catch(cb);
		} else {
			const data = fs.readFileSync(filePath, 'utf8');
			me._parseData(data, cb);
		}
	}
	
	_mergeEndpointHeaders(endpoints) {
		return jsonHelper.stringify({
			type: 'object',
			properties: endpoints.reduce(function (result, endpoint) {
				return _.merge(result,
					jsonHelper.parse(endpoint.Headers).properties);
			}, {}),
			required: []
		}, 4);
	}
	
	_mergeEndpointQueryString(endpoints) {
		return jsonHelper.stringify({
			type: 'object',
			properties: endpoints.reduce(function (result, endpoint) {
				return _.merge(result,
					jsonHelper.parse(endpoint.QueryString).properties);
			}, {}),
			required: []
		}, 4);
	}
	
	_mergeEndpointGroups(endpoints) {
		const endpoint = endpoints[0];
		
		if (endpoints.length <= 1) {
			return endpoint;
		}
		
		const headers = this._mergeEndpointHeaders(endpoints);
		const queryString = this._mergeEndpointQueryString(endpoints);
		
		endpoint.Name = endpoint.Path;
		endpoint.Headers = headers;
		endpoint.QueryString = queryString;
		
		// TODO maybe we should also merge pathParams and body
		
		return endpoint;
	}
	
	_mergeEndpoints(endpoints) {
		const self = this;
		const groups = arrayHelper.groupBy(endpoints, function (endpoint) {
			return [endpoint.Path, endpoint.Method];
		});
		
		return groups.map(function (group) {
			return self._mergeEndpointGroups(group);
		});
	}
	
	_mapSavedEntry(pmr) {
		const savedEntry = new SavedEntry(pmr.name);
		const urlParts = pmr.url.split('?');
		
		savedEntry.Id = pmr.id;
		savedEntry.QueryString = Postman.parseQuery(urlParts[1]);
		savedEntry.Path = Postman.transformVariableFormat(urlParts[0]);
		savedEntry.Method = pmr.method;
		savedEntry.PathParams = this._mapURIParams(pmr.pathVariables);
		savedEntry.Headers = this._mapRequestHeaders(pmr.headers);
		savedEntry.Consumes = Postman.mapConsumes(pmr.dataMode);
		if (savedEntry.Method.toLowerCase() !== 'get' &&
			savedEntry.Method.toLowerCase() !== 'head') {
			savedEntry.Body = this._mapRequestBody(pmr.data);
		}
		
		return savedEntry;
	}
	
	_import() {
		const self = this;
		
		this.project = new Project(this.data.name || '');
		this.project.Description = this.data.description || '';
		
		const requests = this.data.requests || [];
		const folders = this.data.folders || [];
		
		// TODO process only unique requests
		const endpoints = requests.map(function (request) {
			return self._mapEndpoint(request);
		});
		
		this._mergeEndpoints(endpoints).forEach(function (endpoint) {
			self.project.addEndpoint(endpoint);
		});
		
		requests.map(function (request) {
			self.project.addSavedEntry(self._mapSavedEntry(request));
		});
		
		folders.forEach(function (folder) {
			self.project.environment.resourcesOrder.savedEntries.push({
				_id: folder.id,
				name: folder.name,
				items: folder.order.map(function (item) {
					return {
						type: 'savedEntries',
						_id: item
					};
				})
			});
		});
		
		//disable temporarily
		//TODO
		/*for (const i = 0; i < this.data.folders.length; i++) {
		 this.project.addEndpointGroup(mapEndpointGroup(this.data.folders[i]));
		 }*/
	}
}
module.exports = Postman;
