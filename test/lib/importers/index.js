const it = require('mocha/lib/mocha.js').it;
const describe = require('mocha/lib/mocha.js').describe;
const expect = require('chai').expect;

const	baseDir = __dirname + '/../../..';
const	importerDir = baseDir + '/src/importers';
const	importerFactory = require(importerDir + '/index');
const	formats = require(baseDir + '/src/index').Formats;

describe.skip('Importer Factory', function () {
	describe('hasSupport', function () {
		it('should return true for supported format', function () {
			expect(importerFactory.hasSupport(formats.SWAGGER)).to.be.true;
			expect(importerFactory.hasSupport(formats.RAML)).to.be.true;
		});
		it('should return false for not supported format', function () {
			expect(importerFactory.hasSupport(formats.ABCD)).to.be.false;
		});
	});
	describe('factory', function () {
		it('should return valid exporter instance for supported format', function () {
			expect(importerFactory.factory(formats.SWAGGER)).to.be.instanceof(require(importerDir + '/swagger'));
			expect(importerFactory.factory(formats.RAML)).to.be.instanceof(require(importerDir + '/raml10'));
		});
		it('should return null for not supported format', function () {
			expect(importerFactory.factory(formats.ABCD)).to.equal(null);
		});
	});
});
