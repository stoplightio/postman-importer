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
		const me = this;
		return new Promise(function (resolve, reject) {
			me.loadFile(file, options).then(() => {
        me.convert(options.format || me.format, options).then(resolve).catch(reject)
			}).catch(reject)
		})
	}

	convertData(json, options) {
		const me = this;
		return new Promise(function (resolve, reject) {
			me.loadData(json, options).then(() => {
        me.convert(options.format || me.format, options).then(resolve).catch(reject)
			}).catch(reject)
		})
	}

  loadFile(filePath, options) {
    return this.importer.loadFile(filePath, options);
  }

  loadData(rawData, options) {
    const me = this;
    return new Promise(function (resolve, reject) {
      me.importer.loadData(rawData, options)
        .then(resolve)
        .catch(reject);
    });
  }

  convert(format, options) {
    const me = this;
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
  }
}

exports.Converter = Converter;
