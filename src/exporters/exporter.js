const YAML = require('js-yaml');
const Importer = require('../importers/index');
const Formats = require('../formats');

class Exporter {
	constructor() {
		this.data = null;
		this.project = null;
		this.options = null;
	}
	
	get Data() {
		//noinspection JSConstructorReturnsPrimitive
		return this.data;
	}
	
	loadProject(project) {
		this.project = project;
	}
	
	_export() {
		throw new Error('_export method not implemented');
	}
	
	//noinspection ReservedWordAsName
	export(format, options) {
		return new Promise((resolve, reject) => {
			try {
				this.options = options;
				this._export();
				
				const exportedData = this._getData(format);

				if (options && (options.validate === true || options.validateExport === true)) {
					const formattedData = typeof exportedData === 'object' ? JSON.stringify(exportedData) : exportedData;

					const importer = Importer.factory(Formats.AUTO);
					importer.loadData(formattedData, options)
						.then(() => {
							try {
								importer.import();
								resolve(exportedData);
							} catch (err) {
								err.exportedData = exportedData;
								reject(err);
							}
						})
						.catch((err) => {
							err.exportedData = exportedData;
							reject(err);
						});
				} else {
					resolve(exportedData);
				}
			} catch (err) {
				reject(err);
			}
		});
	}
	
	_getData(format) {
		switch (format) {
			case 'yaml':
				return YAML.dump(JSON.parse(JSON.stringify(this.Data)), {lineWidth: -1});
			default:
				return this.Data;
		}
	}
	
	//noinspection JSMethodCanBeStatic
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

module.exports = Exporter;
