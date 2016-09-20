var expect   = require('chai').expect,
    baseDir = __dirname + '/../../..',
    exporterDir = baseDir + '/lib/exporters',
    exporterFactory = require(exporterDir + '/index'),
    formats = require(baseDir + '/index').Formats;

describe('Exporter Factory', function(){
  describe('hasSupport', function(){
    it('should return true for supported format', function(){
      expect(exporterFactory.hasSupport(formats.SWAGGER)).to.be.true;
      expect(exporterFactory.hasSupport(formats.RAML08)).to.be.true;
      expect(exporterFactory.hasSupport(formats.RAML10)).to.be.true;
      expect(exporterFactory.hasSupport(formats.RAML)).to.be.false;
    });
    it('should return false for not supported format', function(){
      expect(exporterFactory.hasSupport(formats.POSTMAN)).to.be.false;
    });
  });
  describe('factory', function(){
    it('should return valid exporter instance for supported format', function(){
      expect(exporterFactory.factory(formats.SWAGGER)).to.be.instanceof(require(exporterDir + '/swagger'));
      expect(exporterFactory.factory(formats.RAML08)).to.be.instanceof(require(exporterDir + '/raml08'));
      expect(exporterFactory.factory(formats.RAML10)).to.be.instanceof(require(exporterDir + '/raml10'));
    });
    it('should return null for not supported format', function(){
      expect(exporterFactory.factory(formats.POSTMAN)).to.equal(null);
    });
  });
});
