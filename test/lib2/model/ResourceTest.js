const expect = require('chai').expect;
const Raml10ResourceConverter = require('../../../lib/raml10/Raml10ResourceConverter');
const Raml10ResourceTypeConverter = require('../../../lib/raml10/Raml10ResourceTypeConverter');
const Oas20ResourceConverter = require('../../../lib/oas20/Oas20ResourceConverter');
const YAML = require('js-yaml');
const Raml = require('../../../lib/importers/baseraml');
const Oas = require('../../../lib/importers/swagger');
const _ = require('lodash');
const fs = require('fs');
const fileHelper = require('../../../lib/utils/file');

describe('Raml10 to Raml10', () => {
	const testWithData = function (sourceFile, targetFile) {
		return done => {
			const importer = new Raml();
			const promise = importer.loadFile(sourceFile);
			promise.then(() => {
				try {
					const source = YAML.safeLoad(fs.readFileSync(sourceFile, 'utf8'));
					const target = YAML.safeLoad(fs.readFileSync(targetFile, 'utf8'));
					const raml10ResourceConverter = new Raml10ResourceConverter();
					const raml10ResourceTypeConverter = new Raml10ResourceTypeConverter();
					const models = raml10ResourceConverter.import(importer.data.resources);
					const resourceTypeModels = raml10ResourceTypeConverter.import(importer.data.resourceTypes);
					
					let result = raml10ResourceConverter.export(models);
					let resourceTypeResult = raml10ResourceTypeConverter.export(resourceTypeModels);
					result.title = source.title;
					result.version = target.version;
					if (target.types) result.types = target.types;
					if (target.resourceTypes) result.resourceTypes = resourceTypeResult;
					
					expect(result).to.deep.equal(target);
					return done();
				} catch (e) {
					done(e);
				}
			}).catch(err => {
				done(err);
			});
		};
	};
	
	const baseDir = __dirname + '/../../data2/raml10-raml10/source';
	const testFiles = fs.readdirSync(baseDir);
	
	testFiles.forEach(function (testFile) {
		if (!_.startsWith(testFile, '.') && fileHelper.pathStartsWith(testFile, 'resource')) {
			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../target/' + testFile;
			
			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile));
				}
			} else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile));
			}
		}
	});
});

describe('Oas20 to Oas20', () => {
	const testWithData = function (sourceFile, targetFile) {
		return done => {
			const importer = new Oas();
			const promise = importer.loadFile(sourceFile);
			promise.then(() => {
				try {
					const source = YAML.safeLoad(fs.readFileSync(sourceFile, 'utf8'));
					const target = YAML.safeLoad(fs.readFileSync(targetFile, 'utf8'));
					const oas20Converter = new Oas20ResourceConverter();
					const models = oas20Converter.import(importer.data.paths);
					
					let result = {};
					result.swagger = source.swagger;
					result.info = source.info;
					if (source.definitions) result.definitions = source.definitions;
					result.paths = oas20Converter.export(models);
					
					expect(result).to.deep.equal(target);
					return done();
				} catch (e) {
					done(e);
				}
			}).catch(err => {
				done(err);
			});
		};
	};
	
	const baseDir = __dirname + '/../../data2/oas20-oas20/source';
	const testFiles = fs.readdirSync(baseDir);
	
	testFiles.forEach(function (testFile) {
		if (!_.startsWith(testFile, '.') && fileHelper.pathStartsWith(testFile, 'resource')) {
			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../target/' + testFile;
			
			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile));
				}
			} else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile));
			}
		}
	});
});

describe('Raml10 to Oas20', () => {
	const testWithData = function (sourceFile, targetFile) {
		return done => {
			const importer = new Raml();
			const promise = importer.loadFile(sourceFile);
			promise.then(() => {
				try {
					const source = YAML.safeLoad(fs.readFileSync(sourceFile, 'utf8'));
					const target = YAML.safeLoad(fs.readFileSync(targetFile, 'utf8'));
					const raml10Converter = new Raml10ResourceConverter();
					const oas20Converter = new Oas20ResourceConverter();
					const models = raml10Converter.import(importer.data.resources);
					
					let result = {};
					result.swagger = '2.0';
					result.info = {
						title: source.title,
						version: source.version.toString()
					};
					if (source.types) result.definitions = source.types;
					result.paths = oas20Converter.export(models);
					
					expect(result).to.deep.equal(target);
					return done();
				} catch (e) {
					done(e);
				}
			}).catch(err => {
				done(err);
			});
		};
	};
	
	const baseDir = __dirname + '/../../data2/raml10-oas20/source';
	const testFiles = fs.readdirSync(baseDir);
	
	testFiles.forEach(function (testFile) {
		if (!_.startsWith(testFile, '.') && fileHelper.pathStartsWith(testFile, 'resource')) {
			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../target/' + testFile;
			
			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile));
				}
			} else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile));
			}
		}
	});
});

describe('Oas20 to Raml10', () => {
	const testWithData = function (sourceFile, targetFile) {
		return done => {
			const importer = new Oas();
			const promise = importer.loadFile(sourceFile);
			promise.then(() => {
				try {
					const source = YAML.safeLoad(fs.readFileSync(sourceFile, 'utf8'));
					const target = YAML.safeLoad(fs.readFileSync(targetFile, 'utf8'));
					const oas20Converter = new Oas20ResourceConverter();
					const raml10Converter = new Raml10ResourceConverter();
					const models = oas20Converter.import(importer.data.paths);
					
					const result = raml10Converter.export(models);
					result.title = source.info.title;
					result.version = parseInt(source.info.version);
					if (source.definitions) result.types = source.definitions;
					
					expect(result).to.deep.equal(target);
					return done();
				} catch (e) {
					done(e);
				}
			}).catch(err => {
				done(err);
			});
		};
	};
	
	const baseDir = __dirname + '/../../data2/oas20-raml10/source';
	const testFiles = fs.readdirSync(baseDir);
	
	testFiles.forEach(function (testFile) {
		if (!_.startsWith(testFile, '.') && fileHelper.pathStartsWith(testFile, 'resource')) {
			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../target/' + testFile;
			
			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile));
				}
			} else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile));
			}
		}
	});
});