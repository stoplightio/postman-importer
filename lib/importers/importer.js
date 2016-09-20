
function Importer() {
  this.data = null;
  this.project = null;
  this.mapped = false;
}

Importer.prototype = {
  get Mapped() {
    return this.mapped;
  },
  get IsDataLoaded() {
    return (this.data !== null);
  }
};

Importer.prototype.loadFile = function (path) {
  throw new Error('loadFile method not implemented');
};

// todo unify api by returning a Promise like the loadData function
Importer.prototype.loadFileWithOptions = function (path, options) {
  throw new Error('loadFile method not implemented');
};

Importer.prototype.loadData = function (data) {
  //TODO validation of the data
  this.data = data;
  return new Promise(function(resolve){
    resolve();
  });
};

Importer.prototype._import = function () {
  throw new Error('_import method not implemented');
};

Importer.prototype.import = function () {
  if(!this.IsDataLoaded) {
    throw new Error('data not loaded for ' + (this.constructor.name.toString()));
  }

  if (!this.Mapped) {
    this._import();
    this.mapped = true;
  }
  return this.project;
};

Importer.prototype._mapEndpoint = function () {
  throw new Error('_mapEndpoint method not implemented');
};

Importer.prototype._mapSchema = function () {
  throw new Error('_mapSchema method not implemented');
};
Importer.prototype._mapQueryString = function () {
  throw new Error('_mapQueryString method not implemented');
};
Importer.prototype._mapURIParams = function () {
  throw new Error('_mapURIParams method not implemented');
};
Importer.prototype._mapRequestBody = function () {
  throw new Error('_mapRequestBody method not implemented');
};
Importer.prototype._mapResponseBody = function () {
  throw new Error('_mapResponseBody method not implemented');
};
Importer.prototype._mapRequestHeaders = function () {
  throw new Error('_mapRequestHeaders method not implemented');
};

module.exports = Importer;
