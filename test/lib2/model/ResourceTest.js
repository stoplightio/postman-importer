const expect = require('chai').expect;
const Raml10Converter = require('../../../lib/raml10/Raml10Converter');
const Oas20Converter = require('../../../lib/oas20/Oas20Converter');
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
					const target = YAML.safeLoad(fs.readFileSync(targetFile, 'utf8'));
					const raml10Converter = new Raml10Converter();
					const models = raml10Converter.import(importer.data);
					const result = raml10Converter.export(models);
					
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
					const target = YAML.safeLoad(fs.readFileSync(targetFile, 'utf8'));
					const oas20Converter = new Oas20Converter();
					const models = oas20Converter.import(importer.data);
					const result = oas20Converter.export(models);
					
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
					const target = YAML.safeLoad(fs.readFileSync(targetFile, 'utf8'));
					const raml10Converter = new Raml10Converter();
					const oas20Converter = new Oas20Converter();
					const models = raml10Converter.import(importer.data);
					const result = oas20Converter.export(models);
					
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
					const target = YAML.safeLoad(fs.readFileSync(targetFile, 'utf8'));
					const oas20Converter = new Oas20Converter();
					const raml10Converter = new Raml10Converter();
					const models = oas20Converter.import(importer.data);
					const result = raml10Converter.export(models);
					
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