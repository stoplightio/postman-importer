var expect   = require('chai').expect,
    specConverter = require('../index');

describe('index', function() {

    it('should expose converter api', function(){
      expect(specConverter.Converter).to.be.a('Function');
    });

    describe('formats', function(){
      it('should expose supported formats', function(){
        expect(specConverter.Formats).to.be.a('Object');
      });
      it('should be raml 08 and 10 supported', function(){
        expect(specConverter.Formats.RAML08).to.be.a('Object');
        expect(specConverter.Formats.RAML10).to.be.a('Object');
      });
      it('should be swagger supported', function(){
        expect(specConverter.Formats.SWAGGER).to.be.a('Object');
      });
      it('should be postman supported', function(){
        expect(specConverter.Formats.POSTMAN).to.be.a('Object');
      });
      it('should be stoplight supported', function(){
        expect(specConverter.Formats.STOPLIGHT).to.be.a('Object');
      });
    });

    describe('exporters', function(){
      it('should expose raml 08 and 10 exporter api', function(){
        var exporter08Instance = new specConverter.Exporter.factory(specConverter.Formats.RAML08);
        expect(exporter08Instance).to.be.an.instanceof(require('../lib/exporters/raml08'));
        var exporter10Instance = new specConverter.Exporter.factory(specConverter.Formats.RAML10);
        expect(exporter10Instance).to.be.an.instanceof(require('../lib/exporters/raml10'));
      });
      it('should expose swagger exporter api', function(){
        var exporterInstance = new specConverter.Exporter.factory(specConverter.Formats.SWAGGER);
        expect(exporterInstance).to.be.an.instanceof(require('../lib/exporters/swagger'));
      });
    });

    describe('importers', function(){
      it('should expose raml importer api', function(){
        var importer08Instance = new specConverter.Importer.factory(specConverter.Formats.RAML08);
        expect(importer08Instance).to.be.an.instanceof(require('../lib/importers/raml08'));
        var importer10Instance = new specConverter.Importer.factory(specConverter.Formats.RAML10);
        expect(importer10Instance).to.be.an.instanceof(require('../lib/importers/raml10'));

      });
      it('should expose swagger importer api', function(){
        var importerInstance = new specConverter.Importer.factory(specConverter.Formats.SWAGGER);
        expect(importerInstance).to.be.an.instanceof(require('../lib/importers/swagger'));
      });
      it('should expose postman importer api', function(){
        var importerInstance = new specConverter.Importer.factory(specConverter.Formats.POSTMAN);
        expect(importerInstance).to.be.an.instanceof(require('../lib/importers/postman'));
      });
      it('should expose stoplight importer api', function(){
        var importerInstance = new specConverter.Importer.factory(specConverter.Formats.STOPLIGHT);
        expect(importerInstance).to.be.an.instanceof(require('../lib/importers/stoplight'));
      });
    });
});
