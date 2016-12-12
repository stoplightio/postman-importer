const expect = require('chai').expect,
	StoplightX = require('../../../lib/exporters/stoplightx'),
	StoplightXImporter = require('../../../lib/importers/stoplightx'),
	Project = require('../../../lib/entities/project');

describe('Stoplight Exporter', function () {
	let exporter;
	let importer;
	let filePath = __dirname + '/../../data/stoplightx.json';
	
	before(function () {
		exporter = new StoplightX();
		importer = new StoplightXImporter();
	});
	
	describe('constructor', function () {
		it('create new instance of StoplightX exporter successfully', function () {
			expect(exporter).to.be.an.instanceof(StoplightX);
		});
	});
	
	describe('_export', function () {
		it('should export project to data', function () {
			expect(exporter.data).to.equal(null);
			//pre-requisite
			exporter.loadProject(new Project('testProject'));
			exporter._export();
			expect(exporter.data).to.not.equal(null);
		});
		
		it('exported data should be of swagger format', function () {
			exporter.loadProject(new Project('testProject'));
			exporter._export();
			expect(exporter.data).to.include.keys('swagger');
			expect(exporter.data).to.be.an('object');
		});
		
		it('should export tests', function (done) {
			importer.loadFile(filePath)
				.then(function () {
					importer.import();
					
					exporter.loadProject(importer.project);
					exporter._export();
					
					let tests = exporter.data['x-tests'];
					
					expect(tests).to.be.an('object');
					expect(Object.keys(tests)).to.have.lengthOf(5);
					expect(tests['WuCyPM8JXTvGAGKHr'].steps[1])
						.to.have.property('$ref', '#/x-tests/SuDCFmBBcvmyA7dCh');
					done();
				})
				.catch(function (err) {
					if (err) {
						return done(err);
					}
				});
		});
	});
});
