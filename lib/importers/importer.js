class Importer {
	constructor() {
		this.data = null;
		this.project = null;
		this.mapped = false;
	}
	
	get Mapped() {
		//noinspection JSConstructorReturnsPrimitive
		return this.mapped;
	}
	
	get IsDataLoaded() {
		//noinspection JSConstructorReturnsPrimitive
		return (this.data !== null);
	}

// TODO unify api by returning a Promise like the loadData function
// https://github.com/stoplightio/api-spec-converter/issues/16
	loadFile() {
		throw new Error('loadFile method not implemented');
	}
	
	loadData(data) {
		// TODO validation of the data
		this.data = data;
		return new Promise(function (resolve) {
			resolve();
		});
	}
	
	_import() {
		throw new Error('_import method not implemented');
	}
	
	//noinspection ReservedWordAsName
	import() {
		if (!this.IsDataLoaded) {
			throw new Error('data not loaded for ' + (this.constructor.name.toString()));
		}
		
		if (!this.Mapped) {
			this._import();
			this.mapped = true;
		}
		
		return this.project;
	}
	
	_mapEndpoint() {
		throw new Error('_mapEndpoint method not implemented');
	}
	
	_mapSchema() {
		throw new Error('_mapSchema method not implemented');
	}
	
	_mapQueryString() {
		throw new Error('_mapQueryString method not implemented');
	}
	
	_mapURIParams() {
		throw new Error('_mapURIParams method not implemented');
	}
	
	_mapRequestBody() {
		throw new Error('_mapRequestBody method not implemented');
	}
	
	_mapResponseBody() {
		throw new Error('_mapResponseBody method not implemented');
	}
	
	_mapRequestHeaders() {
		throw new Error('_mapRequestHeaders method not implemented');
	}
}
module.exports = Importer;
