const fs = require('fs');
const chai = require('chai');
const	expect = chai.expect;
const	specConverter = require('../../src/index');
const	YAML = require('js-yaml');
const	_ = require('lodash');
const it = require('mocha/lib/mocha.js').it;
const describe = require('mocha/lib/mocha.js').describe;

chai.use(require('chai-string'));

describe('Model to RAML', () => {
	const baseDir = __dirname + '/../data/modelToRaml/model';
	const testFiles = fs.readdirSync(baseDir);
	const converter = new specConverter.Converter(specConverter.Formats.RAML, specConverter.Formats.RAML, true);

	const testWithData = function (sourceFile, targetFile) {
		return done => {
			converter.convertFromModel(YAML.safeLoad(fs.readFileSync(sourceFile, 'utf8')))
				.then(raml => {
					try {
						const notExistsTarget = !fs.existsSync(targetFile);
						if (notExistsTarget) {
							console.log('Content for non existing target file ' + targetFile + '\n.');
							console.log('********** Begin file **********\n');
							console.log(raml);
							console.log('********** Finish file **********\n');
							return done(raml);
						} else {
							const formattedData = typeof raml === 'object' ? YAML.dump(raml) : raml;
							expect(YAML.safeLoad(formattedData)).to.deep.equal(YAML.safeLoad(fs.readFileSync(targetFile, 'utf8')));
							done();
						}
					} catch (e) {
						done(e);
					}
				}).catch((err) => {
					console.error('error exporting file.');
					done(err);
				});
		};
	};

	testFiles.forEach(testFile => {
		if (!_.startsWith(testFile, '.')) {
			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../raml/' + testFile;

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

describe('RAML to Model', () => {
	const baseDir = __dirname + '/../data/ramlToModel/raml';
	const testFiles = fs.readdirSync(baseDir);
	const converter = new specConverter.Converter(specConverter.Formats.RAML, specConverter.Formats.RAML, true);

	const testWithData = function (sourceFile, targetFile) {
		return done => {
			converter.getModelFromFile(sourceFile)
				.then(model => {
					try {
						const notExistsTarget = !fs.existsSync(targetFile);
						if (notExistsTarget) {
							const modelJson = JSON.stringify(model, null, 2);
							console.log('Content for non existing target file ' + targetFile + '\n.');
							console.log('********** Begin file **********\n');
							console.log(modelJson);
							console.log('********** Finish file **********\n');
							return done(modelJson);
						} else {
							const formattedData = typeof model === 'object' ? YAML.dump(model) : model;
							expect(YAML.safeLoad(formattedData)).to.deep.equal(YAML.safeLoad(fs.readFileSync(targetFile, 'utf8')));
							done();
						}
					} catch (e) {
						done(e);
					}
				})
				.catch((err) => {
					console.error('error exporting file.');
					done(err);
				});
		};
	};

	testFiles.forEach(testFile => {
		if (!_.startsWith(testFile, '.')) {
			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../model/' + testFile.replace('.yaml', '.json');

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
