const expect = require('chai').expect;
const	specConverter = require('../src/index');
const it = require('mocha/lib/mocha.js').it;
const describe = require('mocha/lib/mocha.js').describe;

describe('index', function() {

	it('should expose converter api', function(){
		expect(specConverter.Converter).to.be.a('Function');
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

	describe('converters', function(){
		it('should expose raml 08 and 10 converter api', function(){
			const converter = new specConverter.Converter(specConverter.Formats.RAML, specConverter.Formats.RAML);
			const ramlImporter = converter.importer;
			const ramlExporter = converter.exporter;
			expect(ramlImporter).to.be.an.instanceof(require('../src/raml/ramlConverter'));
			expect(ramlExporter).to.be.an.instanceof(require('../src/raml/ramlConverter'));
		});
		it('should expose oas 20 converter api', function(){
			const converter = new specConverter.Converter(specConverter.Formats.OAS20, specConverter.Formats.OAS20);
			const oasImporter = converter.importer;
			const oasExporter = converter.exporter;
			expect(oasImporter).to.be.an.instanceof(require('../src/oas20/oas20Converter'));
			expect(oasExporter).to.be.an.instanceof(require('../src/oas20/oas20Converter'));
		});
	});

});
