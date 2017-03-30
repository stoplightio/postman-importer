const expect = require('chai').expect;
const Raml10SecurityDefinitionConverter = require('../../../lib/raml10/Raml10SecurityDefinitionConverter');
const Oas20SecurityDefinitionConverter = require('../../../lib/oas20/Oas20SecurityDefinitionConverter');
const YAML = require('js-yaml');
const Raml = require('../../../lib/importers/baseraml');
const Oas = require('../../../lib/importers/swagger');
const _ = require('lodash');
const fs = require('fs');
const Converter = require('../../../lib/model/converter');
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
					const raml10Converter = new Raml10SecurityDefinitionConverter();
					this.data = importer.data;
					const attrRemove = ['typePropertyKind'];
					this.data.securitySchemes = Converter.cleanObjectFrom(this.data.securitySchemes, attrRemove);
					const models = raml10Converter.import(this.data.securitySchemes);

					const result = {};
					result.securitySchemes = raml10Converter.export(models);
					result.title = source.title;
					result.version = target.version;

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
		if (!_.startsWith(testFile, '.') && fileHelper.pathStartsWith(testFile, 'securityDefinition')) {
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
					const oas20Converter = new Oas20SecurityDefinitionConverter();
					this.data = importer.data;
					const models = oas20Converter.import(this.data.securityDefinitions);

					const result = {};
					result.swagger = source.swagger;
					result.info = source.info;
					result.securityDefinitions = oas20Converter.export(models);
					result.paths = {};

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
		if (!_.startsWith(testFile, '.') && fileHelper.pathStartsWith(testFile, 'securityDefinition')) {
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
					const raml10Converter = new Raml10SecurityDefinitionConverter();
					const oas20Converter = new Oas20SecurityDefinitionConverter();
					this.data = importer.data;
					const attrRemove = ['typePropertyKind'];
					this.data.securitySchemes = Converter.cleanObjectFrom(this.data.securitySchemes, attrRemove);
					const models = raml10Converter.import(this.data.securitySchemes);

					const result = {};
					result.swagger = '2.0';
					result.info = {
						title: source.title,
						version: source.version.toString()
					};
					result.securityDefinitions = oas20Converter.export(models);
					result.paths = {};

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
		if (!_.startsWith(testFile, '.')  && fileHelper.pathStartsWith(testFile, 'securityDefinition')) {
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
					const oas20Converter = new Oas20SecurityDefinitionConverter();
					const raml10Converter = new Raml10SecurityDefinitionConverter();
					this.data = importer.data;
					const models = oas20Converter.import(this.data.securityDefinitions);

					const result = {};
					result.securitySchemes = raml10Converter.export(models);
					result.title = source.info.title;
					result.version = source.info.version;

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
		if (!_.startsWith(testFile, '.') && fileHelper.pathStartsWith(testFile, 'securityDefinition')) {
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