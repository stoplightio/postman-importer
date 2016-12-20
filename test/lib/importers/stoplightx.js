const expect = require('chai').expect,
	_ = require('lodash'),
	StoplightX = require('../../../lib/importers/stoplightx');

describe('StoplightX Importer', function () {
	let importer;
	let filePath = __dirname + '/../../data/stoplightx.json';
	
	beforeEach(function () {
		importer = new StoplightX();
	});
	
	describe('constructor', function () {
		it('create new instance of StoplightX importer successfully', function () {
			expect(importer).to.be.an.instanceof(StoplightX);
		});
	});
	
	describe('loadFile', function () {
		it('should load a StoplightX definition file successfully', function (done) {
			expect(importer.data).to.be.null;
			
			importer.loadFile(filePath)
				.then(() => {
					expect(importer.data).not.to.be.null;
					done();
				})
				.catch((err) => {
					if (err) {
						return done(err);
					}
				});
		});
	});
	
	describe('_import', function () {
		it('should import stoplightx formatted data to project', function (done) {
			//should be null before mapping
			expect(importer.project).to.equal(null);
			
			//pre-requisite
			importer.loadFile(filePath)
				.then(() => {
					importer.import();
					expect(importer.project).to.not.equal(null);
					expect(importer.project.Endpoints.length).gt(0);
					done();
				})
				.catch((err) => {
					if (err) {
						return done(err);
					}
				});
		});
		
		it('should fail to import if test step ref is not found', function (done) {
			importer.loadFile(__dirname + '/../../data/invalid/stoplightx.json')
				.then(() => {
				})
				.catch((err) => {
					expect(err).to.be.an('error');
					done();
				});
		});
	});
	
	describe('middleware', function () {
		it('should support before/after middleware import');
	});
	
	describe('mapEndpoint', function () {
		it('should set proper tags for an endpoint', function (done) {
			importer.loadFile(filePath)
				.then(() => {
					importer.import();
					let endpoint = _.find(importer.project.Endpoints, {operationId: 'deletePetPhoto'});
					expect(endpoint.tags).to.have.lengthOf(1).and.to.include('Group1');
					done();
				})
				.catch((err) => {
					if (err) {
						return done(err);
					}
				})
		});
	});
	
	describe('mapUtilityFunctions', function () {
		it('should map utility functions successfully');
	});
	
	describe('mapSecuritySchemes', function () {
		it('should map security schema successfully');
	});
	
	describe('mapTests', function () {
		it('should map tests successfully', function (done) {
			//
			importer.loadFile(filePath)
				.then(() => {
					importer.import();
					expect(importer.project).to.not.equal(null);
					expect(importer.project.Tests).to.have.length.above(0);
					done();
				})
				.catch((err) => {
					if (err) {
						return done(err);
					}
				});
		});
		
		it('should map test steps successfully', function (done) {
			//
			importer.loadFile(filePath)
				.then(() => {
					importer.import();
					let test = importer.project.Tests[4];
					
					expect(test.steps).to.have.lengthOf(2);
					expect(test.steps[0]).to.have.property('name', 'Create Uncaptured Charge');
					expect(test.steps[1]).to.have.property('test', 'SuDCFmBBcvmyA7dCh');
					
					done();
				})
				.catch((err) => {
					if (err) {
						return done(err);
					}
				});
		});
	});
});
