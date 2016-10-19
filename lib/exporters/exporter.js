var YAML = require('js-yaml'),
    Importer = require('../importers/index');

function Exporter() {
  this.data = null;
  this.project = null;
}
Exporter.prototype = {
  get Data(){
    return this.data;
  }
};

Exporter.prototype.loadSLData = function (rawData, cb) {
  var importer = Importer.factory({
    name: 'StopLight',
    className: 'StopLight'
  });
  var me = this;
  importer.loadData(rawData)
  .then(function(){
    me.project = importer.import();
    cb();
  })
  .catch(function(err){
    cb(err);
  });
};

Exporter.prototype.loadProject = function (project) {
  this.project = project;
};

Exporter.prototype._export = function () {
  throw new Error('_export method not implemented');
};

Exporter.prototype.export = function (format) {
  var me = this;
  return new Promise(function(resolve, reject){
    try {
      me._export();

      var formattedData, exportedData = me._getData(format);
      if (typeof exportedData === 'object') {
        formattedData = JSON.stringify(exportedData);
      } else {
        formattedData = exportedData;
      }

      var importer = Importer.factory({
        name: 'AUTO',
        className: 'Auto'
      });
      importer.loadData(formattedData)
          .then(function(){
            try {
              importer.import();
              resolve(exportedData);
            } catch(err) {
              reject(err);
            }
          })
          .catch(function(err){
						reject(err);
          });
    } catch(err) {
      reject(err);
    }
  });
};

Exporter.prototype._getData = function(format) {
  switch (format) {
    case 'yaml':
      return YAML.dump(JSON.parse(JSON.stringify(this.Data)), {lineWidth: -1});
    default:
      return this.Data;
  }
};

Exporter.prototype._mapEndpoint = function () {
  throw new Error('_mapEndpoint method not implemented');
};

Exporter.prototype._mapSchema = function () {
  throw new Error('_mapSchema method not implemented');
};
Exporter.prototype._mapQueryString = function () {
  throw new Error('_mapQueryString method not implemented');
};
Exporter.prototype._mapURIParams = function () {
  throw new Error('_mapURIParams method not implemented');
};
Exporter.prototype._mapRequestBody = function () {
  throw new Error('_mapRequestBody method not implemented');
};
Exporter.prototype._mapResponseBody = function () {
  throw new Error('_mapResponseBody method not implemented');
};
Exporter.prototype._mapRequestHeaders = function () {
  throw new Error('_mapRequestHeaders method not implemented');
};

module.exports = Exporter;
