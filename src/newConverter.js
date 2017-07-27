const Converters = require('./converters/index');
const YAML = require('js-yaml'); // eslint-disable-line no-unused-vars,FIXME
const fs = require('fs'); // eslint-disable-line no-unused-vars,FIXME

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

	getModelFromData(data, options) {
		return new Promise((resolve, reject) => {
			this.loadData(data, options).then(() => {
				const model = this.importer.import(this.importer.data);
				resolve(model);
			}).catch(reject);
		});
	}


	getModelFromFile(file, options) {
		return new Promise((resolve, reject) => {
			this.loadFile(file, options).then(() => {
				const model = this.importer.import(this.importer.data);
				resolve(model);
			}).catch(reject);
		});
	}

	convertFromModel(model) {
		return new Promise((resolve, reject) => {
			try {
				this.exporter.export(model)
          .then(resolve)
          .catch(reject);
			} catch (e) {
				reject(e);
			}
		});
	}
	
	convertFile(file, options) {
		return new Promise((resolve, reject) => {
			this.getModelFromFile(file, options).then((model) => {
				this.convertFromModel(model).then(resolve).catch(reject);
			}).catch(reject);
		});
	}

	convertData(data, options) {
		return new Promise((resolve, reject) => {
			this.getModelFromData(data, options).then((model) => {
				this.convertFromModel(model).then(resolve).catch(reject);
			}).catch(reject);
		});
	}

	loadFile(filePath, options) {
		return this.importer.loadFile(filePath, options);
	}

	loadData(rawData, options) {
		return this.importer.loadData(rawData, options);
	}

	_format(options) {
		return (options && options.format) || this.format;
	}
}

exports.NewConverter = NewConverter;
