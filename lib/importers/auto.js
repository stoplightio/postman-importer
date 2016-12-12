const fs = require('fs'),
	_ = require('lodash'),
	Importer = require('./importer'),
	Swagger = require('./swagger'),
	RAML08 = require('./raml08'),
	RAML10 = require('./raml10'),
	Postman = require('./postman'),
	StopLightX = require('./stoplightx'),
	urlHelper = require('../utils/url');

class Auto extends Importer {
	// Detect input format automatically
	constructor() {
		super();
		this.importer = null;
		this.detectedFormat = null;
	}
	
	getDetectedFormat() {
		return this.detectedFormat;
	};
	
	_parseStopLightX(data, resolve, reject) {
		let self = this,
			stopLightX = new StopLightX();
		
		stopLightX.loadData(data)
			.then(function () {
				self.detectedFormat = 'STOPLIGHTX';
				self.data = stopLightX.data;
				self.importer = stopLightX;
				
				resolve();
			})
			.catch(reject);
	};
	
	_parsePostman(data, resolve, reject) {
		let self = this,
			postman = new Postman();
		
		postman.loadData(data)
			.then(function () {
				self.detectedFormat = 'POSTMAN';
				self.data = postman.data;
				self.importer = postman;
				
				resolve();
			})
			.catch(reject);
	};
	
	_parseRAML(data, resolve, reject, options) {
		let self = this;
		let raml;
		let detectedFormat;
		if (/#%RAML[\s]*0\.?8?/.test(data)) {
			raml = new RAML08();
			detectedFormat = RAML08.name;
		} else if (/#%RAML[\s]*1\.?0?/.test(data)) {
			raml = new RAML10();
			detectedFormat = RAML10.name;
		}
		
		raml.loadData(data, options)
			.then(function () {
				self.detectedFormat = detectedFormat;
				self.data = raml.data;
				self.importer = raml;
				
				resolve();
			})
			.catch(function (err) {
				reject(err);
			});
	};
	
	_parseSwagger(data, resolve, reject, options) {
		let self = this,
			swagger = new Swagger();
		
		swagger.loadData(data, options)
			.then(function () {
				self.detectedFormat = 'SWAGGER';
				self.data = swagger.data;
				self.importer = swagger;
				
				resolve();
			})
			.catch(function (err) {
				reject(err);
			});
	};
	
	detectFormat(data) {
		if (!data) {
			return;
		}
		
		let parsedData = _.trim(data);
		let type;
		
		try {
			parsedData = JSON.parse(data);
			type = 'json';
		} catch (err) {
			parsedData = data;
			type = 'yaml';
		}
		
		if (type === 'json') {
			if (parsedData.swagger) {
				return 'STOPLIGHTX';
			} else {
				return 'POSTMAN';
			}
		}
		
		if (type === 'yaml') {
			if (/#%RAML[\s]*0\.?8?/.test(parsedData)) {
				return RAML08.name;
			} else if (/#%RAML[\s]*1\.?0?/.test(parsedData)) {
				return RAML10.name;
			}
			
			if (/swagger:[\s'"]*\d\.?\d?/.test(parsedData)) {
				return 'SWAGGER';
			}
		}
		
		return 'UNKNOWN';
	};
	
	loadData(data, options) {
		let self = this,
			format = this.detectFormat(data);
		
		return new Promise(function (resolve, reject) {
			switch (format) {
				case 'STOPLIGHTX':
					return self._parseStopLightX(data, resolve, reject);
				case 'POSTMAN':
					return self._parsePostman(data, resolve, reject);
				case 'RAML08':
				case 'RAML10':
					return self._parseRAML(data, resolve, reject, options);
				case 'SWAGGER':
					return self._parseSwagger(data, resolve, reject, options);
				case 'UNKNOWN':
					return reject(new Error('Unable to parse file. Invalid or unsupported syntax.'));
				default:
					return reject(new Error('No data provided'));
			}
		});
	};
	
	loadFile(filePath) {
		let self = this;
		
		if (urlHelper.isURL(filePath)) {
			// Remote file
			return urlHelper.get(filePath)
				.then(function (body) {
					return self.loadData(body);
				});
		} else {
			// Local file
			let fileContent = fs.readFileSync(filePath, 'utf8');
			return self.loadData(fileContent);
		}
	};
	
	_import() {
		this.importer._import();
		this.project = this.importer.project;
	};
}

module.exports = Auto;
