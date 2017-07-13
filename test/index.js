const expect   = require('chai').expect,
    specConverter = require('../src/index');

describe('index', function() {

    it('should expose converter api', function(){
      expect(specConverter.NewConverter).to.be.a('Function');
    });

    describe('formats', function(){
      it('should expose supported formats', function(){
        expect(specConverter.Formats).to.be.a('Object');
      });
      it('should be raml 08 and 10 supported', function(){
        expect(specConverter.Formats.RAML).to.be.a('Object');
      });
      it('should be oas 20 supported', function(){
        expect(specConverter.Formats.OAS20).to.be.a('Object');
      });
    });

    describe.skip('exporters', function(){
      it('should expose raml 08 and 10 exporter api', function(){
        const exporter08Instance = new specConverter.Exporter.factory(specConverter.Formats.RAML);
        expect(exporter08Instance).to.be.an.instanceof(require('../src/exporters/raml08'));
        const exporter10Instance = new specConverter.Exporter.factory(specConverter.Formats.RAML);
        expect(exporter10Instance).to.be.an.instanceof(require('../src/exporters/raml10'));
      });
      it('should expose swagger exporter api', function(){
        const exporterInstance = new specConverter.Exporter.factory(specConverter.Formats.SWAGGER);
        expect(exporterInstance).to.be.an.instanceof(require('../src/exporters/swagger'));
      });
    });

    describe.skip('importers', function(){
      it('should expose raml importer api', function(){
        const importer08Instance = specConverter.Importer.factory(specConverter.Formats.RAML);
        expect(importer08Instance).to.be.an.instanceof(require('../src/importers/raml08'));
        const importer10Instance = specConverter.Importer.factory(specConverter.Formats.RAML);
        expect(importer10Instance).to.be.an.instanceof(require('../src/importers/raml10'));
      });
      it('should expose swagger importer api', function(){
        const importerInstance = specConverter.Importer.factory(specConverter.Formats.SWAGGER);
        expect(importerInstance).to.be.an.instanceof(require('../src/importers/swagger'));
      });
    });
});
