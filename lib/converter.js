const Importers = require('./importers/index'),
	Exporters = require('./exporters/index');

const _ = require('lodash');
class Converter {
	constructor(fromFormat, toFormat) {
		this.importer = Importers.factory(fromFormat);
		if (!this.importer) {
			throw new Error('from format ' + fromFormat.name + ' not supported');
		}
		this.importer.type = fromFormat;
		
		this.exporter = Exporters.factory(toFormat);
		if (!this.exporter) {
			throw new Error('to format ' + toFormat.name + ' not supported');
		}
		this.exporter.type = toFormat;
	}

// todo unify api by returning a Promise like the loadData function
	loadFile = function (filePath, options) {
		return this.importer.loadFile(filePath, options);
	};
	
	loadData = function (rawData, options) {
		let me = this;
		return new Promise(function (resolve, reject) {
			me.importer.loadData(rawData, options)
				.then(resolve)
				.catch(reject);
		});
	};
	
	convert = function (format, options) {
		let me = this;
		return new Promise(function (resolve, reject) {
			try {
				me.exporter.loadProject(me.importer.import());
				me.exporter.export(format, options)
					.then(function (exportedData) {
						resolve(exportedData);
					})
					.catch(function (err) {
						reject(err);
					});
			} catch (e) {
				reject(e);
			}
		});
	};
}

exports.Converter = Converter;
