const expect = require('chai').expect,
	baseDir = __dirname + '/../../..',
	exporterDir = baseDir + '/lib/exporters',
	exporterFactory = require(exporterDir + '/index'),
	formats = require(baseDir + '/index').Formats;

describe.skip('Exporter Factory', function () {
	describe('hasSupport', function () {
		it('should return true for supported format', function () {
			expect(exporterFactory.hasSupport(formats.SWAGGER)).to.be.true;
			expect(exporterFactory.hasSupport(formats.RAML)).to.be.true;
		});
	});
	describe('factory', function () {
		it('should return valid exporter instance for supported format', function () {
			expect(exporterFactory.factory(formats.SWAGGER)).to.be.instanceof(require(exporterDir + '/swagger'));
			expect(exporterFactory.factory(formats.RAML)).to.be.instanceof(require(exporterDir + '/raml10'));
		});
	});
});
