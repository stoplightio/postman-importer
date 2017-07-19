const Converters = require('./converters/index');
// const YAML = require('js-yaml');
// const fs = require('fs');

class NewConverter {
	constructor(fromFormat, toFormat) {
		this.importer = Converters.factory(fromFormat);
		if (!this.importer) {
			throw new Error('from format ' + fromFormat.name + ' not supported');
		}
		this.importer.type = fromFormat;

		this.exporter = Converters.factory(toFormat);
		if (!this.exporter) {
			throw new Error('to format ' + toFormat.name + ' not supported');
		}
		this.exporter.type = toFormat;
		this.format = this.exporter.type.formats[0];
	}
	
	convertFile(file, options) {
		return new Promise((resolve, reject) => {
			this.loadFile(file, options).then(() => {
				this.convert(this._format(options), options)
					.then(resolve)
					.catch(reject);
			}).catch(reject);
		});
	}

	convertData(json, options) {
		return new Promise((resolve, reject) => {
			this.loadData(json, options).then(() => {
				this.convert(this._format(options), options).then(resolve).catch(reject);
			}).catch(reject);
		});
	}

	loadFile(filePath, options) {
		return this.importer.loadFile(filePath, options);
	}

	loadData(rawData, options) {
		return new Promise((resolve, reject) => {
			this.importer.loadData(rawData, options)
        .then(resolve)
        .catch(reject);
		});
	}
	
	// eslint-disable-next-line no-unused-vars
	convert(format, options) {
		return new Promise((resolve, reject) => {
			try {
				this.exporter.model = this.importer.import(this.importer.data);
				this.exporter.export(this.exporter.model)
					.then(resolve)
					.catch(reject);
			} catch (e) {
				reject(e);
			}
		});
	}

	_format(options) {
		return (options && options.format) || this.format;
	}
}

exports.NewConverter = NewConverter;
