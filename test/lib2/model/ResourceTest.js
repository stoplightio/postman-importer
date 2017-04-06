const expect = require('chai').expect;
const Raml10ResourceConverter = require('../../../lib/raml10/Raml10ResourceConverter');
const Raml10ResourceTypeConverter = require('../../../lib/raml10/Raml10ResourceTypeConverter');
const Raml10TraitConverter = require('../../../lib/raml10/Raml10TraitConverter');
const Oas20ResourceConverter = require('../../../lib/oas20/Oas20ResourceConverter');
const Oas20TraitConverter = require('../../../lib/oas20/Oas20TraitConverter');
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
					const raml10TraitConverter = new Raml10TraitConverter();
					const models = raml10ResourceConverter.import(importer.data.resources);
					const resourceTypeModels = raml10ResourceTypeConverter.import(importer.data.resourceTypes);
					const traitModels = raml10TraitConverter.import(importer.data.traits);
					
					let result = raml10ResourceConverter.export(models);
					const resourceTypeResult = raml10ResourceTypeConverter.export(resourceTypeModels);
					const traitResult = raml10TraitConverter.export(traitModels);
					result.title = source.title;
					result.version = target.version;
					if (target.types) result.types = target.types;
					if (target.resourceTypes) result.resourceTypes = resourceTypeResult;
					if (target.traits) result.traits = traitResult;
					
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
					const oas20ResourceConverter = new Oas20ResourceConverter();
					// const oas20ResourceTypeConverter = new Oas20ResourceTypeConverter();
					const oas20TraitConverter = new Oas20TraitConverter();
					const models = oas20ResourceConverter.import(importer.data.paths);
					// const resourceTypeModels = oas20ResourceTypeConverter.import(importer.data.parameters);
					const traitModels = oas20TraitConverter.import(importer.data.parameters);
					const resourceResult = oas20ResourceConverter.export(models);
					// const resourceTypeResult = oas20ResourceTypeConverter.export(resourceTypeModels);
					const traitResult = oas20TraitConverter.export(traitModels);
					
					const result = {};
					result.swagger = source.swagger;
					result.info = source.info;
					if (source.definitions) result.definitions = source.definitions;
					result.paths = resourceResult;
					if (!_.isEmpty(traitResult)) result.parameters = traitResult;
					
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
					const raml10ResourceConverter = new Raml10ResourceConverter();
					const raml10ResourceTypeConverter = new Raml10ResourceTypeConverter();
					const raml10TraitConverter = new Raml10TraitConverter();
					const oas20ResourceConverter = new Oas20ResourceConverter();
					// const oas20ResourceTypeConverter = new Oas20ResourceTypeConverter();
					const oas20TraitConverter = new Oas20TraitConverter();
					const models = raml10ResourceConverter.import(importer.data.resources);
					const resourceTypeModels = raml10ResourceTypeConverter.import(importer.data.resourceTypes);
					const traitModels = raml10TraitConverter.import(importer.data.traits);
					const resourceResult = oas20ResourceConverter.export(models);
					// const resourceTypeResult = oas20ResourceTypeConverter.export(resourceTypeModels);
					const traitResult = oas20TraitConverter.export(traitModels);
					
					let result = {};
					result.swagger = '2.0';
					result.info = {
						title: source.title,
						version: source.version.toString()
					};
					if (source.types) result.definitions = source.types;
					result.paths = resourceResult;
					// result.resourceTypes = resourceTypeResult;
					if (!_.isEmpty(traitResult)) result.parameters = traitResult;
					
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
					const oas20ResourceConverter = new Oas20ResourceConverter();
					// const oas20ResourceTypeConverter = new Oas20ResourceTypeConverter();
					const oas20TraitConverter = new Oas20TraitConverter();
					const raml10ResourceConverter = new Raml10ResourceConverter();
					// const raml10ResourceTypeConverter = new Raml10ResourceTypeConverter();
					const raml10TraitConverter = new Raml10TraitConverter();
					const models = oas20ResourceConverter.import(importer.data.paths);
					// const resourceTypeModels = oas20ResourceTypeConverter.import(importer.data.resourceTypes);
					const traitModels = oas20TraitConverter.import(importer.data.parameters);
					const resourceResult = raml10ResourceConverter.export(models);
					// const resourceTypeResult = raml10ResourceTypeConverter.export(resourceTypeModels);
					const traitResult = raml10TraitConverter.export(traitModels);
					
					const result = resourceResult;
					result.title = source.info.title;
					result.version = parseInt(source.info.version);
					if (source.definitions) result.types = source.definitions;
					if (!_.isEmpty(traitResult)) result.traits = traitResult;
					
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