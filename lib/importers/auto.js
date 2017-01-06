const fs = require('fs'),
	_ = require('lodash'),
	Formats = require('../formats'),
	Importer = require('./importer'),
	urlHelper = require('../utils/url');

const importers = {
  Postman: require('./postman'),
  RAML08: require('./raml08'),
  RAML10: require('./raml10'),
  Swagger: require('./swagger'),
  StopLight: require('./stoplight'),
  StopLightX: require('./stoplightx')
};


class Auto extends Importer {
	// Detect input format automatically
	constructor() {
		super();
		this.importer = null;
		this.detectedFormat = null;
	}
	
	getDetectedFormat() {
		return this.detectedFormat;
	}

	static detectFormat(data) {
		if (!data) return;
    data = _.trim(data);

		try {
			const json = JSON.parse(data);
			// found a json
      return json.swagger ? Formats.STOPLIGHTX : Formats.POSTMAN;
		} catch (err) {
			// assume a yaml
			if (/#%RAML[\s]*1\.?0?/.test(data)) return Formats.RAML10;
			if (/#%RAML[\s]*0\.?8?/.test(data)) return Formats.RAML08;
      if (/swagger:[\s'"]*\d\.?\d?/.test(data)) return Formats.SWAGGER;
		}
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
			// Local file
			const fileContent = fs.readFileSync(filePath, 'utf8');
			return this.loadData(fileContent, options);
		}
	}
	
	_import() {
		this.importer._import();
		this.project = this.importer.project;
	}

  _parse(detectedFormat, data, url, resolve, reject, options) {
    const importer = new importers[detectedFormat.className]();
    const promise = url ? importer.loadFile(url, options) : importer.loadData(data, options);
    promise.then(() => {
      this.detectedFormat = detectedFormat;
      this.data = importer.data;
      this.importer = importer;
      resolve();
    }).catch(reject);
  }
}

module.exports = Auto;
