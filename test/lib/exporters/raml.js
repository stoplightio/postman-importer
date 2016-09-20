var expect   = require('chai').expect,
    RAML10 = require('../../../lib/exporters/raml10'),
    fs = require('fs');

describe('RAML Exporter', function(){

  var ramlExporter, slData;
  beforeEach(function(){
    ramlExporter = new RAML10();
    slData = require(__dirname+'/../../data/stoplight.json');
  });

  describe('constructor', function(){
    it('should return valid raml instance', function(){
      expect(ramlExporter).to.be.instanceOf(RAML10);
    });
    it('should posess generic exporter prototype', function(){
      expect(ramlExporter).to.respondTo('loadSLData');
      expect(ramlExporter).to.respondTo('loadProject');
      expect(ramlExporter).to.respondTo('_export');
      expect(ramlExporter).to.respondTo('export');
      expect(ramlExporter).to.respondTo('_getData');
    });
  });

  describe('_export', function(){
    it('should perform export for loaded data', function(done){
      ramlExporter.loadSLData(slData, function(err){
        if(err)return done(err);
        ramlExporter.export('yaml')
        .then(function(ramlData, err){
          if (err) return done(err);
          expect(ramlData).to.not.be.empty;
          done();
        })
        .catch(function(err){
          done(err);
        });
      });
    });
  });

  describe('_getData', function(){
    it('should contain custom implementation as doesn\'t support json export', function(){
      ramlExporter.loadSLData(slData, function(err){
        if (err)return done(err);
        try {
          var ramlData = ramlExporter.export('json');
          //force fail as not expected
          expect(true).to.be.equal(false);
        }
        catch(err) {
          expect(err).to.not.equal(undefined);
        }
      });
    });
  });
  //TODO test internal methods individually

  it('shouldn\'t throw error if param json schema required attribute doesn\'t exist');
});
