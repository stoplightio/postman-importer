const fs = require('fs'),
	_ = require('lodash'),
	Formats = require('../formats'),
	Importer = require('./importer'),
	urlHelper = require('../utils/url');

const importers = {
  RAML08: require('./raml08'),
  RAML10: require('./raml10'),
  Swagger: require('./swagger'),
};


class Auto extends Importer {
	// Detect input format automatically
	constructor() {
		super();
		this.importer = null;
	}
	
	static detectFormat(data) {
		if (!data) return;
    data = _.trim(data);

		if (/#%RAML[\s]*1\.?0?/.test(data)) return Formats.RAML10;
		if (/#%RAML[\s]*0\.?8?/.test(data)) return Formats.RAML08;
		if ((/swagger:[\s'"]*\d\.?\d?/.test(data)) || /{"swagger":[\s'"]*\d\.?\d?/.test(data)) return Formats.SWAGGER;
	}
	
	loadData(data, options, url) {
		return new Promise((resolve, reject) => {
			if (!data) {
        return reject(new Error('No data provided'));
			}

			const detectedFormat = Auto.detectFormat(data);
      if (!detectedFormat) {
        return reject(new Error('Unable to parse file. Invalid or unsupported syntax.'));
			}

      return this._parse(detectedFormat, data, url, resolve, reject, options);
		});
	}
	
	loadFile(filePath, options) {
		if (urlHelper.isURL(filePath)) {
			// Remote file
			return urlHelper.get(filePath)
				.then((body) => {
					return this.loadData(body, options, filePath);
				});
		} else {
			if (options && options.fsResolver) {
				return options.fsResolver.contentAsync(filePath).then(fileContent => {
					return this.loadData(fileContent, options, filePath);
				})
			} else {
				// Local file
				const fileContent = fs.readFileSync(filePath, 'utf8');
				return this.loadData(fileContent, options);
			}
		}
	}
	
	_import() {
		return this.importer._import();
	}

  _parse(detectedFormat, data, url, resolve, reject, options) {
    const importer = new importers[detectedFormat.className]();
    const promise = url ? importer.loadFile(url, options) : importer.loadData(data, options);
    promise.then(() => {
      this.data = importer.data;
      this.importer = importer;
      resolve();
    }).catch(reject);
  }
}

module.exports = Auto;
