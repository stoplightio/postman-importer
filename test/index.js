const expect   = require('chai').expect,
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
        expect(specConverter.Formats.OAS).to.be.a('Object');
      });
    });

    describe('exporters', function(){
      it('should expose raml 08 and 10 exporter api', function(){
        const exporter08Instance = new specConverter.Exporter.factory(specConverter.Formats.RAML08);
        expect(exporter08Instance).to.be.an.instanceof(require('../lib/exporters/raml08'));
        const exporter10Instance = new specConverter.Exporter.factory(specConverter.Formats.RAML10);
        expect(exporter10Instance).to.be.an.instanceof(require('../lib/exporters/raml10'));
      });
      it('should expose swagger exporter api', function(){
        const exporterInstance = new specConverter.Exporter.factory(specConverter.Formats.OAS);
        expect(exporterInstance).to.be.an.instanceof(require('../lib/exporters/swagger'));
      });
    });

    describe('importers', function(){
      it('should expose raml importer api', function(){
        const importer08Instance = specConverter.Importer.factory(specConverter.Formats.RAML08);
        expect(importer08Instance).to.be.an.instanceof(require('../lib/importers/raml08'));
        const importer10Instance = specConverter.Importer.factory(specConverter.Formats.RAML10);
        expect(importer10Instance).to.be.an.instanceof(require('../lib/importers/raml10'));
      });
      it('should expose swagger importer api', function(){
        const importerInstance = specConverter.Importer.factory(specConverter.Formats.OAS);
        expect(importerInstance).to.be.an.instanceof(require('../lib/importers/swagger'));
      });
    });
});
