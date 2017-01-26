const expect = require('chai').expect,
	RAML10 = require('../../../lib/exporters/raml10');

describe('RAML Exporter', function () {
	
	let ramlExporter;
	beforeEach(function () {
		ramlExporter = new RAML10();
	});
	
	describe('constructor', function () {
		it('should return valid raml instance', function () {
			expect(ramlExporter).to.be.instanceOf(RAML10);
		});
		it('should posess generic exporter prototype', function () {
			expect(ramlExporter).to.respondTo('loadProject');
			expect(ramlExporter).to.respondTo('_export');
			expect(ramlExporter).to.respondTo('export');
			expect(ramlExporter).to.respondTo('_getData');
		});
	});

	//TODO test internal methods individually
	
	it('shouldn\'t throw error if param json schema required attribute doesn\'t exist');
});
