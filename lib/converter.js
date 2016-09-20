var Importers = require('./importers/index'),
    Exporters = require('./exporters/index');

function Converter(fromFormat, toFormat) {
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

Converter.prototype.loadFile = function (filePath, cb) {
  return this.importer.loadFile(filePath, cb);
};

// todo unify api by returning a Promise like the loadData function
Converter.prototype.loadFileWithOptions = function (filePath, options, cb) {
  return this.importer.loadFileWithOptions(filePath, options, cb);
};

Converter.prototype.loadData = function (rawData, options) {
  var me = this;
  return new Promise(function(resolve, reject){
    me.importer.loadData(rawData, options)
    .then(resolve)
    .catch(reject);
  });
};

Converter.prototype.convert = function (format, cb) {
  var me = this;
  return new Promise(function(resolve, reject){
    me.exporter.loadProject(me.importer.import());
    me.exporter.export(format)
    .then(function(exportedData){
      if(cb)cb(null, exportedData);
      resolve(exportedData);
    })
    .catch(function(err){
      if(cb)cb(err, null);
      reject(err);
    });
  });
};

exports.Converter = Converter;
