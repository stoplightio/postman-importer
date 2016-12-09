var fs = require('fs'),
    _ = require('lodash'),
    Importer = require('./importer'),
    Swagger = require('./swagger'),
    RAML08 = require('./raml08'),
    RAML10 = require('./raml10'),
    Postman = require('./postman'),
    StopLightX = require('./stoplightx'),
    urlHelper = require('../utils/url');

// Detect input format automatically
function Auto() {
  this.importer = null;
  this.detectedFormat = null;
}

Auto.prototype = new Importer();

Auto.prototype.getDetectedFormat = function() {
  return this.detectedFormat;
};

Auto.prototype._parseStopLightX = function(data, resolve, reject) {
  var self = this,
      stopLightX = new StopLightX();

  stopLightX.loadData(data)
    .then(function() {
      self.detectedFormat = 'STOPLIGHTX';
      self.data = stopLightX.data;
      self.importer = stopLightX;

      resolve();
    })
    .catch(reject);
};

Auto.prototype._parsePostman = function(data, resolve, reject) {
  var self = this,
      postman = new Postman();

  postman.loadData(data)
    .then(function() {
      self.detectedFormat = 'POSTMAN';
      self.data = postman.data;
      self.importer = postman;

      resolve();
    })
    .catch(reject);
};

Auto.prototype._parseRAML = function(data, resolve, reject, options) {
  var self = this;
  var raml;
  var detectedFormat;
  if (/#%RAML[\s]*0\.?8?/.test(data)) {
    raml = new RAML08();
    detectedFormat = RAML08.name;
  } else if (/#%RAML[\s]*1\.?0?/.test(data)) {
    raml = new RAML10();
    detectedFormat = RAML10.name;
  }

  raml.loadData(data, options)
    .then(function() {
      self.detectedFormat = detectedFormat;
      self.data = raml.data;
      self.importer = raml;

      resolve();
    })
    .catch(function(err) {
    	reject(err);
		});
};

Auto.prototype._parseSwagger = function(data, resolve, reject, options) {
  var self = this,
      swagger = new Swagger();

  swagger.loadData(data, options)
    .then(function() {
      self.detectedFormat = 'SWAGGER';
      self.data = swagger.data;
      self.importer = swagger;

      resolve();
    })
    .catch(function(err) {
    	reject(err);
		});
};

Auto.prototype.detectFormat = function(data) {
  if (!data) {
    return;
  }

  var parsedData = _.trim(data);
  var type;

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

Auto.prototype.loadData = function(data, options) {
  var self = this,
      format = this.detectFormat(data);

  return new Promise(function(resolve, reject) {
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

Auto.prototype.loadFile = function(filePath) {
  var self = this;

  if (urlHelper.isURL(filePath)) {
    // Remote file
    return urlHelper.get(filePath)
      .then(function(body) {
        return self.loadData(body);
      });
  } else {
    // Local file
    var fileContent = fs.readFileSync(filePath, 'utf8');
    return self.loadData(fileContent);
  }
};

Auto.prototype._import = function() {
  this.importer._import();
  this.project = this.importer.project;
};

module.exports = Auto;
