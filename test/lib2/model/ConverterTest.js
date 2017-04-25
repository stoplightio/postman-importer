const chai = require('chai'),
	expect = chai.expect,
	specConverter = require('../../../index'),
	fs = require('fs'),
	YAML = require('js-yaml'),
	_ = require('lodash'),
	path = require('path');
const it = require("mocha/lib/mocha.js").it;
const describe = require("mocha/lib/mocha.js").describe;
const fileHelper = require('../../../lib/utils/file');

chai.use(require('chai-string'));

const filePathMap = {
	'/types/Complex.json': '/data/types/Complex.json',
	'/Pet.json': '/data/petstore-separate/spec/Pet.json',
	'/NewPet.json': '/data/petstore-separate/spec/NewPet.json',
	'/common/Error.json': '/data/petstore-separate/common/Error.json',
	'/types/Address.yaml': '/data/types/Address.yaml'
};

const myFsResolver = {
	content: function (filePath) {
		const path = __dirname + '/..' + filePathMap[filePath]; ///Users/gaston/mulesoft/api-spec-converter/test/lib
		return fs.readFileSync(path, 'UTF8');
	},
	contentAsync: function (filePath) {
		return new Promise(function (resolve, reject) {
			try {
				const p = path.parse(filePath);

				if (p.dir.indexOf('types') > 0) {
					const fileName = p.base === 'Person.xyz' ? 'Person.json' : p.base;
					resolve(fs.readFileSync(p.dir + '/' + fileName, 'UTF8'));
				} else {
					resolve(fs.readFileSync(filePath, 'UTF8'));
				}
			}
			catch (e) {
				reject(e);
			}
		});
	}
};

describe('Raml10 to Raml10', () => {
	const baseDir = __dirname + '/../../data2/raml10-raml10/source';
	const testFiles = fs.readdirSync(baseDir);
	const converter = new specConverter.NewConverter(specConverter.Formats.RAML10, specConverter.Formats.RAML10);

	const testWithData = function (sourceFile, targetFile, validate, extension) {
		const validateOptions = {
			validate: validate,
			noExtension: !extension,
			fsResolver: myFsResolver,
			format: 'yaml'
		};

		return function (done) {
			converter.convertFile(sourceFile, validateOptions)
				.then(resultOAS => {
					try {
						const notExistsTarget = !fs.existsSync(targetFile);
						if (notExistsTarget) {
							console.log('Content for non existing target file ' + targetFile + '\n.');
							console.log('********** Begin file **********\n');
							console.log(resultOAS);
							console.log('********** Finish file **********\n');
							return done(resultOAS);
						} else {
							const formattedData = typeof resultOAS === 'object' ? JSON.stringify(resultOAS) : resultOAS;
							expect(YAML.safeLoad(formattedData)).to.deep.equal(YAML.safeLoad(fs.readFileSync(targetFile, 'utf8')));
							if (!extension && _.includes(resultOAS, 'x-raml')) {
								return done('error: output file contains extension property.\n sourceFile:[' + sourceFile + ']\n targetFile:[' + targetFile + ']');
							}
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

	testFiles.forEach(function (testFile) {
		if (!_.startsWith(testFile, '.') && fileHelper.pathStartsWith(testFile, 'api')) {
			const validate = !_.includes(testFile, 'novalidate');
			const skip = _.includes(testFile, 'skip');
			const extension = _.includes(testFile, 'extension');

			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../target/' + testFile;

			if (skip) return ;
			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile, validate, extension));
				}
			} else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile, validate, extension));
			}
		}
	});
});

describe('Oas20 to Oas20', () => {
	const baseDir = __dirname + '/../../data2/oas20-oas20/source';
	const testFiles = fs.readdirSync(baseDir);
	const converter = new specConverter.NewConverter(specConverter.Formats.OAS20, specConverter.Formats.OAS20);

	const testWithData = function (sourceFile, targetFile, validate, extension) {
		const validateOptions = {
			validate: validate,
			noExtension: !extension,
			fsResolver: myFsResolver,
			format: 'yaml'
		};

		return function (done) {
			converter.convertFile(sourceFile, validateOptions)
				.then(resultOAS => {
					try {
						const notExistsTarget = !fs.existsSync(targetFile);
						if (notExistsTarget) {
							console.log('Content for non existing target file ' + targetFile + '\n.');
							console.log('********** Begin file **********\n');
							console.log(resultOAS);
							console.log('********** Finish file **********\n');
							return done(resultOAS);
						} else {
							const formattedData = typeof resultOAS === 'object' ? JSON.stringify(resultOAS) : resultOAS;
							expect(YAML.safeLoad(formattedData)).to.deep.equal(YAML.safeLoad(fs.readFileSync(targetFile, 'utf8')));
							if (!extension && _.includes(resultOAS, 'x-raml')) {
								return done('error: output file contains extension property.\n sourceFile:[' + sourceFile + ']\n targetFile:[' + targetFile + ']');
							}
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

	testFiles.forEach(function (testFile) {
		if (!_.startsWith(testFile, '.') && fileHelper.pathStartsWith(testFile, 'api')) {
			const validate = !_.includes(testFile, 'novalidate');
			const skip = _.includes(testFile, 'skip');
			const extension = _.includes(testFile, 'extension');

			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../target/' + testFile;

			if (skip) return ;
			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile, validate, extension));
				}
			} else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile, validate, extension));
			}
		}
	});
});

describe('Raml10 to Oas20', () => {
	const baseDir = __dirname + '/../../data2/raml10-oas20/source';
	const testFiles = fs.readdirSync(baseDir);
	const converter = new specConverter.NewConverter(specConverter.Formats.RAML10, specConverter.Formats.OAS20);

	const testWithData = function (sourceFile, targetFile, validate, extension) {
		const validateOptions = {
			validate: validate,
			noExtension: !extension,
			fsResolver: myFsResolver,
			format: 'yaml'
		};

		return function (done) {
			converter.convertFile(sourceFile, validateOptions)
				.then(resultOAS => {
					try {
						const notExistsTarget = !fs.existsSync(targetFile);
						if (notExistsTarget) {
							console.log('Content for non existing target file ' + targetFile + '\n.');
							console.log('********** Begin file **********\n');
							console.log(resultOAS);
							console.log('********** Finish file **********\n');
							return done(resultOAS);
						} else {
							const formattedData = typeof resultOAS === 'object' ? JSON.stringify(resultOAS) : resultOAS;
							expect(YAML.safeLoad(formattedData)).to.deep.equal(YAML.safeLoad(fs.readFileSync(targetFile, 'utf8')));
							if (!extension && _.includes(resultOAS, 'x-raml')) {
								return done('error: output file contains extension property.\n sourceFile:[' + sourceFile + ']\n targetFile:[' + targetFile + ']');
							}
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

	testFiles.forEach(function (testFile) {
		if (!_.startsWith(testFile, '.') && fileHelper.pathStartsWith(testFile, 'api')) {
			const validate = !_.includes(testFile, 'novalidate');
			const skip = _.includes(testFile, 'skip');
			const extension = _.includes(testFile, 'extension');

			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../target/' + testFile;

			if (skip) return ;
			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile, validate, extension));
				}
			} else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile, validate, extension));
			}
		}
	});
});

describe('Oas20 to Raml10', () => {
	const baseDir = __dirname + '/../../data2/oas20-raml10/source';
	const testFiles = fs.readdirSync(baseDir);
	const converter = new specConverter.NewConverter(specConverter.Formats.OAS20, specConverter.Formats.RAML10);

	const testWithData = function (sourceFile, targetFile, validate, extension) {
		const validateOptions = {
			validate: validate,
			noExtension: !extension,
			fsResolver: myFsResolver,
			format: 'yaml'
		};

		return function (done) {
			converter.convertFile(sourceFile, validateOptions)
				.then(resultOAS => {
					try {
						const notExistsTarget = !fs.existsSync(targetFile);
						if (notExistsTarget) {
							console.log('Content for non existing target file ' + targetFile + '\n.');
							console.log('********** Begin file **********\n');
							console.log(resultOAS);
							console.log('********** Finish file **********\n');
							return done(resultOAS);
						} else {
							const formattedData = typeof resultOAS === 'object' ? JSON.stringify(resultOAS) : resultOAS;
							expect(YAML.safeLoad(formattedData)).to.deep.equal(YAML.safeLoad(fs.readFileSync(targetFile, 'utf8')));
							if (!extension && _.includes(resultOAS, 'x-raml')) {
								return done('error: output file contains extension property.\n sourceFile:[' + sourceFile + ']\n targetFile:[' + targetFile + ']');
							}
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

	testFiles.forEach(function (testFile) {
		if (!_.startsWith(testFile, '.') && fileHelper.pathStartsWith(testFile, 'api')) {
			const validate = !_.includes(testFile, 'novalidate');
			const skip = _.includes(testFile, 'skip');
			const extension = _.includes(testFile, 'extension');

			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../target/' + testFile;

			if (skip) return ;
			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile, validate, extension));
				}
			} else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile, validate, extension));
			}
		}
	});
});