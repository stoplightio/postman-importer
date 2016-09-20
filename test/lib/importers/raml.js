var expect   = require('chai').expect,
    RAML08 = require('../../../lib/importers/raml08'),
    RAML10 = require('../../../lib/importers/raml10'),
    Project = require('../../../lib/entities/project'),
    fs = require('fs');

describe('RAML 0.8 Importer', function(){
  var ramlImporter, filePath = __dirname+'/../../data/raml08.yaml';
  beforeEach(function(){
    ramlImporter = new RAML08();
  });

  describe('constructor', function(){
    it('should return new RAML importer instance successfully', function(){
      expect(ramlImporter).to.be.instanceOf(RAML08);
    });
    it('should possess generic importer prototype', function(){
      expect(ramlImporter).to.respondTo('loadFile');
      expect(ramlImporter).to.respondTo('loadData');
      expect(ramlImporter).to.respondTo('_import');
      expect(ramlImporter).to.respondTo('import');
    });
  });
  describe('loadFile', function(){
    it('should be able to load a valid yaml file', function(done){
      ramlImporter.loadFile(filePath, function(){
        done();
      });
    });
    it('should return error for invalid file', function(done){
      ramlImporter.loadFile(__dirname+'/../../data/invalid/raml08.yaml', function(err){
        expect(err).not.to.be.undefined;
        expect(err.message).to.equal("Invalid first line. A RAML document is expected to start with '#%RAML <version> <?fragment type>'.");
        done();
      });
    });
  });
  describe('import', function(){
    it('should perform import operation on loaded data', function(done){
      ramlImporter.loadFile(filePath, function(){
        try {
          var slProject = ramlImporter.import();
          expect(slProject).to.be.instanceOf(Project);
          expect(slProject.Endpoints.length).to.gt(0);
          done();
        }
        catch(err){
          done(err);
        }
      });
    });
  });

  //TODO write test for internal functions
  describe('_mapHost', function(){
    it('should map empty host as null', function(){
      var importer = new RAML08();
      importer.project = new Project('test');
      importer.data = {
        baseUri: undefined
      };
      importer._mapHost();
      expect(importer.project.Environment.Host).to.be.equal(null);
    });
  });


  //TODO write test for internal functions
  describe('_mapSchema', function(){
    it('should map schema data successfully');
  });

  describe('_mapQueryString', function(){
    it('should map query string data successfully');
  });

  describe('_mapURIParams', function(){
    it('should map uri params data successfully');
  });

  describe('_mapRequestBody', function(){
    it('should map request body data successfully');
  });

  describe('_mapResponseBody', function(){
    it('should map response body data successfully');
  });

  describe('_mapRequestHeaders', function(){
    it('should map request header data successfully');
  });
});


describe('RAML 1.0 Importer', function(){
  var ramlImporter, filePath = __dirname+'/../../data/raml10-json-type.yaml';
  beforeEach(function(){
    ramlImporter = new RAML10();
  });

  describe('constructor', function(){
    it('should return new RAML importer instance successfully', function(){
      expect(ramlImporter).to.be.instanceOf(RAML10);
    });
    it('should possess generic importer prototype', function(){
      expect(ramlImporter).to.respondTo('loadFile');
      expect(ramlImporter).to.respondTo('loadData');
      expect(ramlImporter).to.respondTo('_import');
      expect(ramlImporter).to.respondTo('import');
    });
  });
  describe('loadFile', function(){
    it('should be able to load a valid yaml file', function(done){
      ramlImporter.loadFile(filePath, function(){
        done();
      });
    });
    it('should return error for invalid file', function(done){
      ramlImporter.loadFile(__dirname+'/../../data/invalid/raml10.yaml', function(err){
        expect(err).not.to.be.undefined;
        expect(err.message).to.equal("Invalid first line. A RAML document is expected to start with '#%RAML <version> <?fragment type>'.");
        done();
      });
    });

    it ('should be able to load a valid yaml file including external type definiton', function (done) {
      ramlImporter.loadFile(__dirname+'/../../data/raml10-include-type.yaml', function(err){
        if (err) return done(err);
        try {
          var slProject = ramlImporter.import();
          expect(slProject).to.be.instanceOf(Project);
          expect(slProject.Schemas.length).to.eq(2);
          done();
        }
        catch(err){
          done(err);
        }
      });
    });

    it ('should be able to load a valid yaml file including external type definiton using fsResolver', function (done) {
      var myFsResolver = {
        content: function (path) {},
        contentAsync: function (path) {
          return new Promise(function(resolve, reject){
            try {
              if (path.indexOf('Person.xyz') > 0) {
                path = path.replace('Person.xyz', '/types/Person.json');
              }
              resolve(fs.readFileSync(path, 'UTF8'));
            }
            catch (e) {
              reject(e);
            }
          });
        }
      };

      var myOptions = {
        fsResolver : myFsResolver
      };

      ramlImporter.loadFileWithOptions(__dirname+'/../../data/raml10-include-fsresolver-type.yaml', myOptions, function(err){
        if (err) return done(err);
        try {
          var slProject = ramlImporter.import();
          expect(slProject).to.be.instanceOf(Project);
          expect(slProject.Schemas[0].definition.description).to.eq('Person details');
          expect(slProject.Schemas[1].definition.description).to.eq('Error details');
          done();
        }
        catch(err){
          done(err);
        }
      });
    });

    it ('should be able to load a valid yaml file including raml type definiton', function (done) {
      ramlImporter.loadFile(__dirname+'/../../data/raml10-yaml-type.yaml', function(err){
        if (err) return done(err);
        try {
          var slProject = ramlImporter.import();
          expect(slProject).to.be.instanceOf(Project);
          expect(slProject.Schemas.length).to.eq(2);
          done();
        }
        catch(err){
          done(err);
        }
      });
    });


    it ('should return error importing yaml file including non exisiting type file', function (done) {
      ramlImporter.loadFile(__dirname+'/../../data/invalid/raml10-include-type.yaml', function(err){
        if (err) return done(err);
        try {
          ramlImporter.import();
          done(err);
        }
        catch(err){
          expect(err).not.to.be.undefined;
          done();
        }
      });
    });

  });
  describe('import', function(){
    it('should perform import operation on loaded data', function(done){
      ramlImporter.loadFile(filePath, function(err){
        if (err) {
          done(err);
        }

        try {
          var slProject = ramlImporter.import();
          expect(slProject).to.be.instanceOf(Project);
          expect(slProject.Endpoints.length).to.gt(0);
          done();
        }
        catch(err){
          done(err);
        }
      });
    });
  });

  //TODO write test for internal functions
  describe('_mapHost', function(){
    it('should map empty host as null', function(){
      var importer = new RAML10();
      importer.project = new Project('test');
      importer.data = {
        baseUri: undefined
      };
      importer._mapHost();
      expect(importer.project.Environment.Host).to.be.equal(null);
    });
  });


  //TODO write test for internal functions
  describe('_mapSchema', function(){
    it('should map schema data successfully');
  });

  describe('_mapQueryString', function(){
    it('should map query string data successfully');
  });

  describe('_mapURIParams', function(){
    it('should map uri params data successfully');
  });

  describe('_mapRequestBody', function(){
    it('should map request body data successfully');
  });

  describe('_mapResponseBody', function(){
    it('should map response body data successfully');
  });

  describe('_mapRequestHeaders', function(){
    it('should map request header data successfully');
  });
});
