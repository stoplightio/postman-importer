const it = require('mocha/lib/mocha.js').it;
const describe = require('mocha/lib/mocha.js').describe;
const beforeEach = require('mocha/lib/mocha.js').beforeEach;
const expect = require('chai').expect;
const fs = require('fs');
const path = require('path');

const Auto = require('../../../src/importers/auto');
const Project = require('../../../src/entities/project');

describe.skip('Auto Importer', function () {
	let importer;
	const dataPath = path.join(__dirname, '..', '..', 'data');
	
	beforeEach(function () {
		importer = new Auto();
	});
	
	describe('constructor', function () {
		it('should possess generic importer prototype', function () {
			expect(importer).to.respondTo('loadFile');
			expect(importer).to.respondTo('loadData');
			expect(importer).to.respondTo('_import');
			expect(importer).to.respondTo('import');
		});
	});
	
	describe('detectFormat', function () {
		it('should detect RAML 0.8', function () {
			const fileContent = fs.readFileSync(path.join(dataPath, '/raml-import/raml/raml08.yaml'), 'utf8');
			const	format = Auto.detectFormat(fileContent);
			
			expect(format.name).to.be.equal('RAML 0.8');
		});

		it('should detect RAML 1.0', function () {
			const fileContent = fs.readFileSync(path.join(dataPath, '/raml-import/raml/raml10-file.yaml'), 'utf8');
			const format = Auto.detectFormat(fileContent);

			expect(format.name).to.be.equal('RAML 1.0');
		});
		
		it('should detect SWAGGER', function () {
			const fileContent = fs.readFileSync(path.join(dataPath, 'swagger.yaml'), 'utf8');
			const format = Auto.detectFormat(fileContent);
			
			expect(format.name).to.be.equal('OAS 2.0');
		});
	});
	
	describe('_parse<format>', function () {
		it('should be able to parse a valid RAML .yaml file', function (done) {
			importer.loadFile(path.join(dataPath, '/raml-import/raml/raml08.yaml'))
				.then(() => {
					const project = importer.import();
					expect(project).to.be.instanceOf(Project);
					expect(project.Resources.length).to.gt(0);
					done();
					
				})
				.catch((err) => {
					return done(err);
				});
		});
		
		it('should be able to parse a valid Swagger .yaml file', function (done) {
			importer.loadFile(path.join(dataPath, 'swagger.yaml'))
				.then(() => {
					const project = importer.import();
					expect(project).to.be.instanceOf(Project);
					expect(project.Endpoints.length).to.gt(0);
					done();
					
				})
				.catch((err) => {
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
				.then(() => {
					const project = importer.import();
					expect(project).to.be.instanceOf(Project);
					expect(project.Resources.length).to.gt(0);
					done();
				})
				.catch((err) => {
					return done(err);
				});
		});
		
		it('should be able to load a valid raml 1.0 yaml file', function (done) {
			importer.loadFile(__dirname + '/../../data/raml-import/raml/raml10-simple.yaml')
				.then(() => {
					const project = importer.import();
					expect(project).to.be.instanceOf(Project);
					expect(project.Resources.length).to.gt(0);
					done();
				})
				.catch((err) => {
					console.log(err);
					done(err);
				});
		});
	});
	
	describe('loadFile', function () {
		it('should be able to load a local file', function (done) {
			importer.loadFile(path.join(dataPath, 'swagger.yaml'))
				.then(() => {
					const project = importer.import();
					expect(project).to.be.instanceOf(Project);
					expect(project.Endpoints.length).to.gt(0);
					done();
				})
				.catch((err) => {
					return done(err);
				});
		});
		
		it('should be able to load a remote file', function (done) {
			importer.loadFile('http://petstore.swagger.io/v2/swagger.json')
				.then(() => {
					const project = importer.import();
					expect(project).to.be.instanceOf(Project);
					expect(project.Endpoints.length).to.gt(0);
					done();
				})
				.catch((err) => {
					return done(err);
				});
		});
	});
});
