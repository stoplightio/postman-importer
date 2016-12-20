const expect = require('chai').expect,
	Stoplight = require('../../../lib/importers/stoplight');

describe('Stoplight Importer', function () {
	let importer, filePath = __dirname + '/../../data/stoplight.json';
	let slData = require(filePath);
	beforeEach(function () {
		importer = new Stoplight();
	});
	describe('constructor', function () {
		it('create new instance of Stoplight importer successfully', function () {
			expect(importer).to.be.an.instanceof(Stoplight);
		});
	});
	describe('loadFile', function () {
		it('should load a stoplight definition file successfully', function (done) {
			expect(importer.data).to.be.null;
			importer.loadFile(filePath, function () {
				expect(importer.data).not.to.be.null;
				done();
			});
		});
		it('should return error for invalid json definition file', function (done) {
			expect(importer.data).to.be.null;
			importer.loadFile(__dirname + '/../../data/invalid/stoplight.json', function (err) {
				expect(err).not.to.be.null;
				expect(err.message).to.startsWith('Unexpected token i');
				expect(importer.data).to.be.null;
				done();
			});
		});
	});
	describe('_import', function () {
		it('should import data to project', function (done) {
			//should be null before mapping
			expect(importer.project).to.equal(null);
			//pre-requisite
			importer.loadData(slData)
				.then(() => {
					try {
						importer._import();
						expect(importer.project).to.not.equal(null);
						expect(importer.project.Endpoints.length).gt(0);
						done();
					} catch (err) {
						done(err);
					}
				})
				.catch(done);
		});
		it('exported data should have at least one endpoint', function (done) {
			importer.loadData(slData)
				.then(() => {
					importer._import();
					expect(importer.project.Endpoints.length).to.gt(0);
					done();
				})
				.catch(done);
		});
	});
	describe('middleware', function () {
		it('should support before/after middleware import');
	});
	
	describe('mapEndpoint', function () {
		it('should map endpoints successfully');
	});
	
	describe('mapUtilityFunctions', function () {
		it('should map utility functions successfully');
	});
	
	describe('mapSecuritySchemes', function () {
		it('should map security schema successfully');
	});
	
});
