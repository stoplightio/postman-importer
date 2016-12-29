const Importers = require('./importers/index'),
	Exporters = require('./exporters/index');

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
    this.format = this.exporter.type.formats[0];
	}

	convertFile(file, options) {
		return new Promise((resolve, reject) => {
			this.loadFile(file, options).then(() => {
        this.convert(this._format(options), options).then(resolve).catch(reject)
			}).catch(reject)
		})
	}

	convertData(json, options) {
		return new Promise((resolve, reject) => {
			this.loadData(json, options).then(() => {
        this.convert(this._format(options), options).then(resolve).catch(reject)
			}).catch(reject)
		})
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

  convert(format, options) {
    return new Promise((resolve, reject) => {
      try {
        this.exporter.loadProject(this.importer.import());
        this.exporter.export(format, options)
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

exports.Converter = Converter;
