const expect = require('chai').expect,
  Postman = require('../../../lib/importers/postman'),
  Project = require('../../../lib/entities/project'),
  _ = require('lodash');

describe('Postman Importer', function() {
  let postmanImporter;

  beforeEach(function() {
    postmanImporter = new Postman();
  });

  describe('constructor', function() {
    it('should return new postman importer instance successfully', function() {
      expect(postmanImporter).to.be.instanceOf(Postman);
    });

    it('should possess generic importer prototype', function() {
      expect(postmanImporter).to.respondTo('loadFile');
      expect(postmanImporter).to.respondTo('loadData');
      expect(postmanImporter).to.respondTo('_import');
      expect(postmanImporter).to.respondTo('import');
    });
  });

  describe('loadFile', function() {
    it('should be able to load a valid json file', function(done) {
      postmanImporter.loadFile(__dirname + '/../../data/postman.json', function(err) {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('should return error for invalid json file', function(done) {
      postmanImporter.loadFile(__dirname + '/../../data/invalid/postman.json', function(err) {
        try {
          expect(err).to.not.be.undefined;
          //TODO error message comparison
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('should be able to load a remote url', function(done) {
      postmanImporter.loadFile('https://raw.githubusercontent.com/stoplightio/api-spec-converter/master/example/source/postman.json', function(err) {
        if (err) {
          return done(err);
        }

        let slProject = postmanImporter.import();
        expect(slProject).to.be.instanceOf(Project);
        expect(slProject.Endpoints.length).to.gt(0);

        done();
      });
    });

    it('should return error for valid json, but invalid formatted postman definition file', function(done) {
      // TODO implement this test
      done();
    });
  });

  describe('_import', function() {
    it('should perform import operation on loaded data', function(done) {
      postmanImporter.loadFile(__dirname + '/../../data/postman.json', function(err) {
        if (err) {
          return done(err);
        }

        let slProject = postmanImporter.import();
        expect(slProject).to.be.instanceOf(Project);

        done();
      });
    });

    describe('_mergeEndpoints', function() {
      it('should merge similar endpoints', function(done) {
        postmanImporter.loadFile(__dirname + '/../../data/postman.json', function(err) {
          if (err) {
            return done(err);
          }

          let slProject = postmanImporter.import();
          expect(postmanImporter.data.requests.length).to.gt(slProject.Endpoints.length);

          done();
        });
      });

      it('should not merge endpoints with different methods', function(done) {
        postmanImporter.loadFile(__dirname + '/../../data/postman.json', function(err) {
          if (err) {
            return done(err);
          }

          let slProject = postmanImporter.import();
          let endpoint = _.find(slProject.endpoints, {
            request: {
              path: 'http://petstore.swagger.io/v2/pet/1467573987135',
              method: 'post'
            }
          });

          expect(endpoint).to.not.be.undefined;

          done();
        });
      });

      it('should merge headers', function(done) {
        postmanImporter.loadFile(__dirname + '/../../data/postman.json', function(err) {
          if (err) {
            return done(err);
          }

          let slProject = postmanImporter.import();
          let endpoint = _.find(slProject.endpoints, {
            request: {
              path: 'http://petstore.swagger.io/v2/pet/1467573987135',
              method: 'get'
            }
          });
          let headers = JSON.parse(endpoint.request.headers);

          expect(headers.properties).to.contain.all.keys('header1', 'header2');

          done();
        });
      });

      it('should merge query string', function(done) {
        postmanImporter.loadFile(__dirname + '/../../data/postman.json', function(err) {
          if (err) {
            return done(err);
          }

          let slProject = postmanImporter.import();
          let mergedEndpoint = _.find(slProject.endpoints, {
            request: {path: 'http://petstore.swagger.io/v2/pet/1467573987135'}
          });
          let queryString = JSON.parse(mergedEndpoint.request.queryString);

          expect(queryString.properties).to.contain.all.keys('queryparam1', 'queryparam2');

          done();
        });
      });
    });

    describe('Saved Entries', function() {
      it('should import saved entries', function(done) {
        postmanImporter.loadFile(__dirname + '/../../data/postman.json', function(err) {
          if (err) {
            return done(err);
          }

          let slProject = postmanImporter.import();

          expect(slProject).to.be.instanceOf(Project);
          expect(slProject.SavedEntries).to.have.length.above(0);
          expect(slProject.SavedEntries[4]).to.have.property('request').that.is.an.object;

          done();
        });
      });

      it('should import saved entries groups in resourceOrder', function(done) {
        postmanImporter.loadFile(__dirname + '/../../data/postman.json', function(err) {
          if (err) {
            return done(err);
          }

          let slProject = postmanImporter.import();
          let groups = slProject.environment.resourcesOrder.savedEntries;

          expect(groups).to.have.length.above(0);
          expect(groups[1]).to.have.property('name', 'Petstore');
          expect(groups[1].items).to.have.length.above(0);
          expect(groups[1].items[0]).to.have.keys('_id', 'type');

          done();
        });
      });
    });
  });

  describe('middleware', function() {
    it('should support before/after middleware import', function(done) {
      // TODO implement this test
      done();
    });
  });

  //TODO write test for internal functions
});
