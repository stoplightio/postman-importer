const YAML = require('js-yaml'),
	Importer = require('../importers/index');

class Exporter {
	constructor() {
		this.data = null;
		this.project = null;
	}
	
	get Data() {
		return this.data;
	};
	
	loadSLData = function (rawData) {
		let importer = Importer.factory({
			name: 'StopLight',
			className: 'StopLight'
		});
		let me = this;
		
		return new Promise(function (resolve, reject) {
			
			importer.loadData(rawData)
				.then(function () {
					me.project = importer.import();
					resolve();
				})
				.catch(function (err) {
					reject(err);
				});
		});
	};
	
	loadProject = function (project) {
		this.project = project;
	};
	
	_export = function () {
		throw new Error('_export method not implemented');
	};
	
	export = function (format, options) {
		let me = this;
		return new Promise(function (resolve, reject) {
			try {
				me._export();
				
				let formattedData, exportedData = me._getData(format);
				if (typeof exportedData === 'object') {
					formattedData = JSON.stringify(exportedData);
				} else {
					formattedData = exportedData;
				}
				
				let importer = Importer.factory({
					name: 'AUTO',
					className: 'Auto'
				});
				importer.loadData(formattedData, options)
					.then(function () {
						try {
							importer.import();
							resolve(exportedData);
						} catch (err) {
							resolve(exportedData, err);
						}
					})
					.catch(function (err) {
						reject(err);
					});
			} catch (err) {
				reject(err);
			}
		});
	};
	
	_getData = function (format) {
		switch (format) {
			case 'yaml':
				return YAML.dump(JSON.parse(JSON.stringify(this.Data)), {lineWidth: -1});
			default:
				return this.Data;
		}
	};
	
	_mapEndpoint = function () {
		throw new Error('_mapEndpoint method not implemented');
	};
	
	_mapSchema = function () {
		throw new Error('_mapSchema method not implemented');
	};
	
	_mapQueryString = function () {
		throw new Error('_mapQueryString method not implemented');
	};
	
	_mapURIParams = function () {
		throw new Error('_mapURIParams method not implemented');
	};
	
	_mapRequestBody = function () {
		throw new Error('_mapRequestBody method not implemented');
	};
	
	_mapResponseBody = function () {
		throw new Error('_mapResponseBody method not implemented');
	};
	
	_mapRequestHeaders = function () {
		throw new Error('_mapRequestHeaders method not implemented');
	};
}

module.exports = Exporter;
