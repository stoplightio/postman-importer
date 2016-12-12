const expect = require('chai').expect,
	fs = require('fs'),
	path = require('path'),
	Auto = require('../../../lib/importers/auto'),
	Project = require('../../../lib/entities/project');
import {describe, beforeEach, it} from "mocha";

describe('Auto Importer', function () {
	let importer,
		dataPath = path.join(__dirname, '..', '..', 'data');
	
	beforeEach(function () {
		importer = new Auto();
	});
	
	describe('constructor', function () {
		it('should return new postman importer instance successfully', function () {
			expect(importer).to.be.instanceOf(Auto);
		});
		
		it('should possess generic importer prototype', function () {
			expect(importer).to.respondTo('loadFile');
			expect(importer).to.respondTo('loadData');
			expect(importer).to.respondTo('_import');
			expect(importer).to.respondTo('import');
		});
	});
	
	describe('detectFormat', function () {
		it('should detect STOPLIGHTX', function () {
			let fileContent = fs.readFileSync(path.join(dataPath, 'stoplightx.json'), 'utf8'),
				format = Auto.detectFormat(fileContent);
			
			expect(format).to.be.equal('STOPLIGHTX');
		});
		
		it('should detect POSTMAN', function () {
			let fileContent = fs.readFileSync(path.join(dataPath, 'postman.json'), 'utf8'),
				format = Auto.detectFormat(fileContent);
			
			expect(format).to.be.equal('POSTMAN');
		});
		
		it('should detect RAML', function () {
			let fileContent = fs.readFileSync(path.join(dataPath, '/raml-import/raml/raml08.yaml'), 'utf8'),
				format = Auto.detectFormat(fileContent);
			
			expect(format).to.be.equal('RAML08');
		});
		
		it('should detect SWAGGER', function () {
			let fileContent = fs.readFileSync(path.join(dataPath, 'swagger.yaml'), 'utf8'),
				format = Auto.detectFormat(fileContent);
			
			expect(format).to.be.equal('SWAGGER');
		});
		
		it('should detect UNKNOWN', function () {
			let fileContent = fs.readFileSync(path.join(dataPath, 'invalid', 'postman.json'), 'utf8'),
				format = Auto.detectFormat(fileContent);
			
			expect(format).to.be.equal('UNKNOWN');
		});
	});
	
	describe('_parse<format>', function () {
		it('should be able to parse a valid StopLightX .json file', function (done) {
			importer.loadFile(path.join(dataPath, 'stoplightx.json'))
				.then(function () {
					importer.import();
					expect(importer.project).to.be.instanceOf(Project);
					expect(importer.project.Endpoints.length).to.gt(0);
					done();
				})
				.catch(function (err) {
					return done(err);
				});
		});
		
		it('should be able to parse a valid Postman .json file', function (done) {
			importer.loadFile(path.join(dataPath, 'postman.json'))
				.then(function () {
					importer.import();
					expect(importer.project).to.be.instanceOf(Project);
					expect(importer.project.Endpoints.length).to.gt(0);
					done();
				})
				.catch(function (err) {
					return done(err);
				});
		});
		
		it('should be able to parse a valid RAML .yaml file', function (done) {
			importer.loadFile(path.join(dataPath, '/raml-import/raml/raml08.yaml'))
				.then(function () {
					importer.import();
					expect(importer.project).to.be.instanceOf(Project);
					expect(importer.project.Endpoints.length).to.gt(0);
					done();
					
				})
				.catch(function (err) {
					return done(err);
				});
		});
		
		it('should be able to parse a valid Swagger .yaml file', function (done) {
			importer.loadFile(path.join(dataPath, 'swagger.yaml'))
				.then(function () {
					importer.import();
					expect(importer.project).to.be.instanceOf(Project);
					expect(importer.project.Endpoints.length).to.gt(0);
					done();
					
				})
				.catch(function (err) {
					return done(err);
				});
		});
		
		it('should throw an error for unknown data format', function (done) {
			importer.loadFile(path.join(dataPath, 'invalid', 'missing-comma-swagger.json')).catch(function (err) {
				expect(err).to.be.an('error').and.to.have
					.property('message', 'Unable to parse file. Invalid or unsupported syntax.');
				done();
			});
		});
		
		it('should throw an error for no data', function (done) {
			importer.loadFile(path.join(dataPath, 'invalid', 'empty.json')).catch(function (err) {
				expect(err).to.be.an('error').and.to.have
					.property('message', 'No data provided');
				done();
			});
		});
		
		it('should be able to load a valid raml 0.8 yaml file', function (done) {
			importer.loadFile(__dirname + '/../../data/raml-import/raml/raml08.yaml')
				.then(function () {
					importer.import();
					expect(importer.project).to.be.instanceOf(Project);
					expect(importer.project.Endpoints.length).to.gt(0);
					done();
				})
				.catch(function (err) {
					return done(err);
				});
		});
		
		it('should be able to load a valid raml 1.0 yaml file', function (done) {
			importer.loadFile(__dirname + '/../../data/raml-import/raml/raml10-simple.yaml')
				.then(function () {
					importer.import();
					expect(importer.project).to.be.instanceOf(Project);
					expect(importer.project.Endpoints.length).to.gt(0);
					done();
				})
				.catch(function (err) {
					console.log(err);
					done(err);
				});
		});
	});
	
	describe('loadFile', function () {
		it('should be able to load a local file', function (done) {
			importer.loadFile(path.join(dataPath, 'swagger.json'))
				.then(function () {
					importer.import();
					expect(importer.project).to.be.instanceOf(Project);
					expect(importer.project.Endpoints.length).to.gt(0);
					done();
				})
				.catch(function (err) {
					return done(err);
				});
		});
		
		it('should be able to load a remote file', function (done) {
			importer.loadFile('http://petstore.swagger.io/v2/swagger.json')
				.then(function () {
					importer.import();
					expect(importer.project).to.be.instanceOf(Project);
					expect(importer.project.Endpoints.length).to.gt(0);
					done();
				})
				.catch(function (err) {
					return done(err);
				});
		});
	});
	
	describe('getDetectedFormat', function () {
		it('should return detected format', function (done) {
			importer.loadFile(path.join(dataPath, 'stoplightx.json'))
				.then(function () {
					expect(importer.getDetectedFormat()).to.be.equal('STOPLIGHTX');
					expect(importer.detectedFormat).to.be.equal('STOPLIGHTX');
					done();
				})
				.catch(function (err) {
					return done(err);
				});
		});
	});
});
