const chai = require('chai');
const expect = chai.expect;
const fs = require('fs');
const YAML = require('js-yaml');
const _ = require('lodash');
const path = require('path');
const beforeEach = require('mocha/lib/mocha.js').beforeEach;
const afterEach = require('mocha/lib/mocha.js').afterEach;
const it = require('mocha/lib/mocha.js').it;
const describe = require('mocha/lib/mocha.js').describe;
const timeout = 60 * 1000; //1000 ms == 1s.

chai.use(require('chai-string'));

const specConverter = require('../../src/index');

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

describe('Converter from RAML to OAS20', function () {
	const fullPath = __dirname + '/../data/raml-import/raml/raml08.yaml';
	let converterInstance;
	beforeEach(function () {
		converterInstance = new specConverter.Converter(specConverter.Formats.RAML, specConverter.Formats.OAS20);
	});
	afterEach(function () {
		converterInstance = null;
	});
	describe('constructor', function () {
		it('should successfully create new converter instance', function () {
			expect(converterInstance).to.be.an.instanceof(specConverter.Converter);
		});
	});
	describe('_loadFile', function () {
		it('should successfully load "from"/"importer" compatible file', function (done) {
			converterInstance._loadFile(fullPath).then(() => {
				done();
			});
		});
	});
	
	describe('convert', function () {
		describe ('should successfully convert and return converted data', () => {
			it('using json format', function (done) {
				converterInstance.convertFile(fullPath, {format: 'json'})
					.then((returnedData) => {
						expect(returnedData).to.be.an('string');
						expect(returnedData).to.include('"swagger": "2.0"');
						done();
					})
					.catch((err) => {
						done(err);
					});
			});

			it('using yaml format', function (done) {
				converterInstance.convertFile(fullPath, {format: 'yaml'})
					.then((returnedData) => {
						expect(returnedData).to.be.an('string');
						expect(returnedData).to.include('swagger: \'2.0\'');
						done();
					})
					.catch((err) => {
						done(err);
					});
			});
		});
	});
});

describe('Converter from OAS20 to RAML', function () {
	const fullPath = __dirname + '/../data/swagger.json';
	let converterInstance;
	beforeEach(function () {
		converterInstance = new specConverter.Converter(specConverter.Formats.OAS20, specConverter.Formats.RAML);
	});
	afterEach(function () {
		converterInstance = null;
	});
	describe('constructor', function () {
		it('should successfully create new converter instance', function () {
			expect(converterInstance).to.be.an.instanceof(specConverter.Converter);
		});
	});
	describe('_loadFile', function () {
		it('should successfully load "from"/"importer" compatible file', function (done) {
			converterInstance._loadFile(fullPath).then(() => {
				done();
			});
		});
	});

	describe('convert', function () {
		it('using yaml format', function (done) {
			converterInstance.convertFile(fullPath, {format: 'yaml'})
				.then((returnedData) => {
					expect(returnedData).to.be.an('string');
					expect(returnedData).to.include('#%RAML 1.0');
					done();
				})
				.catch((err) => {
					done(err);
				});
		});
	});
});

describe('from swagger to raml', function () {
	const baseDir = __dirname + '/../data/swagger-import/swagger';
	const testFiles = fs.readdirSync(baseDir);
	const converter = new specConverter.Converter(specConverter.Formats.OAS20, specConverter.Formats.RAML);

	const testWithData = function (sourceFile, targetFile, stringCompare, validate) {

		return function (done) {
			const validateOptions = {
				validate: validate,
				fsResolver: myFsResolver
			};
			converter.convertFile(sourceFile, validateOptions)
				.then(resultRAML => {
					try {
						const notExistsTarget = !fs.existsSync(targetFile);
						if (notExistsTarget) {
							console.log('Content for non existing target file ' + targetFile + '\n.');
							console.log('********** Begin file **********\n');
							console.log(resultRAML);
							console.log('********** Finish file **********\n');
							return done(resultRAML);
						} else {
							const formattedData = typeof resultRAML === 'object' ? JSON.stringify(resultRAML) : resultRAML;
							if (stringCompare === true) {
								expect(formattedData).to.deep.equal(fs.readFileSync(targetFile,'utf8'));
							} else {
								expect(YAML.safeLoad(formattedData)).to.deep.equal(YAML.safeLoad(fs.readFileSync(targetFile, 'utf8')));
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
		if (!_.startsWith(testFile, '.')) {
			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../raml/' + _.replace(testFile, 'json', 'yaml');
			const stringCompare = _.includes(testFile, 'stringcompare');
			const validate = !_.includes(testFile, 'novalidate');
			
			if (process.env.testFile) {
				if (_.endsWith(sourceFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile, stringCompare, validate)).timeout(timeout);
				}
			}
			else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile, stringCompare, validate)).timeout(timeout);
			}
		}
	});
	
	if (!process.env.testFile) {
		it('should convert from swagger petstore with external refs to raml 1.0',
			testWithData(__dirname + '/../data/petstore-separate/spec/swagger.json', __dirname + '/../data/petstore-separate/spec/raml10.yaml', true));
	}
});

describe('from raml to swagger', function () {
	const baseDir = __dirname + '/../data/raml-import/raml';
	const testFiles = fs.readdirSync(baseDir);

	const testWithData = function (sourceFile, targetFile, validate, extension) {
		const validateOptions = {
			validate: validate,
			noExtension: !extension,
			fsResolver: myFsResolver,
			format: 'yaml'
		};
		const converter = new specConverter.Converter(specConverter.Formats.RAML, specConverter.Formats.OAS20);

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
		if (!_.startsWith(testFile, '.')) {
			const validate = !_.includes(testFile, 'novalidate');
			const skip = _.includes(testFile, 'skip');
			const extension = _.includes(testFile, 'extension');

			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../swagger/' + testFile;

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

describe('Raml10 to Raml10', () => {
	const baseDir = __dirname + '/../data/raml10-raml10/source';
	const testFiles = fs.readdirSync(baseDir);
	const converter = new specConverter.Converter(specConverter.Formats.RAML, specConverter.Formats.RAML);

	const testWithData = function (sourceFile, targetFile, extension) {
		const validateOptions = {
			noExtension: !extension,
			fsResolver: myFsResolver,
			format: 'yaml'
		};

		return function (done) {
			converter.convertFile(sourceFile, validateOptions)
				.then(resultRaml => {
					try {
						const notExistsTarget = !fs.existsSync(targetFile);
						if (notExistsTarget) {
							console.log('Content for non existing target file ' + targetFile + '\n.');
							console.log('********** Begin file **********\n');
							console.log(resultRaml);
							console.log('********** Finish file **********\n');
							return done(resultRaml);
						} else {
							const formattedData = typeof resultRaml === 'object' ? JSON.stringify(resultRaml) : resultRaml;
							expect(YAML.safeLoad(formattedData)).to.deep.equal(YAML.safeLoad(fs.readFileSync(targetFile, 'utf8')));
							if (!extension && _.includes(resultRaml, 'x-raml')) {
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
		if (!_.startsWith(testFile, '.')) {
			const extension = _.includes(testFile, 'extension');
			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../target/' + testFile;

			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile, extension));
				}
			} else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile, extension));
			}
		}
	});
});

describe('Oas20 to Oas20', () => {
	const baseDir = __dirname + '/../data/oas20-oas20/source';
	const testFiles = fs.readdirSync(baseDir);
	const converter = new specConverter.Converter(specConverter.Formats.OAS20, specConverter.Formats.OAS20);

	const testWithData = function (sourceFile, targetFile, extension) {
		const validateOptions = {
			noExtension: !extension,
			fsResolver: myFsResolver,
			format: 'yaml'
		};

		return function (done) {
			const data = fs.readFileSync(sourceFile, 'utf8');
			converter.convertData(data, validateOptions)
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
		if (!_.startsWith(testFile, '.')) {
			const extension = _.includes(testFile, 'extension');
			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../target/' + testFile;

			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile, extension));
				}
			} else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile, extension));
			}
		}
	});
});

describe('Raml10 to Oas20', () => {
	const baseDir = __dirname + '/../data/raml10-oas20/source';
	const testFiles = fs.readdirSync(baseDir);
	const converter = new specConverter.Converter(specConverter.Formats.RAML, specConverter.Formats.OAS20);

	const testWithData = function (sourceFile, targetFile, extension) {
		const validateOptions = {
			noExtension: !extension,
			fsResolver: myFsResolver,
			format: 'yaml',
			attributeDefaults: false,
			rejectOnErrors: true
		};

		return function (done) {
			const data = fs.readFileSync(sourceFile, 'utf8');
			converter.convertData(data, validateOptions)
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
		if (!_.startsWith(testFile, '.')) {
			const extension = _.includes(testFile, 'extension');
			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../target/' + testFile;

			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile, extension));
				}
			} else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile, extension));
			}
		}
	});
});

describe('Oas20 to Raml10', () => {
	const baseDir = __dirname + '/../data/oas20-raml10/source';
	const testFiles = fs.readdirSync(baseDir);
	const converter = new specConverter.Converter(specConverter.Formats.OAS20, specConverter.Formats.RAML);

	const testWithData = function (sourceFile, targetFile, extension) {
		const validateOptions = {
			noExtension: !extension,
			fsResolver: myFsResolver,
			format: 'yaml'
		};

		return function (done) {
			converter.convertFile(sourceFile, validateOptions)
				.then(resultRaml => {
					try {
						const notExistsTarget = !fs.existsSync(targetFile);
						if (notExistsTarget) {
							console.log('Content for non existing target file ' + targetFile + '\n.');
							console.log('********** Begin file **********\n');
							console.log(resultRaml);
							console.log('********** Finish file **********\n');
							return done(resultRaml);
						} else {
							const formattedData = typeof resultRaml === 'object' ? JSON.stringify(resultRaml) : resultRaml;
							expect(YAML.safeLoad(formattedData)).to.deep.equal(YAML.safeLoad(fs.readFileSync(targetFile, 'utf8')));
							if (!extension && _.includes(resultRaml, 'x-raml')) {
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
		if (!_.startsWith(testFile, '.')) {
			const extension = _.includes(testFile, 'extension');
			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../target/' + testFile;

			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile, extension));
				}
			} else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile, extension));
			}
		}
	});
});

describe('Raml08 to Raml10', () => {
	const baseDir = __dirname + '/../data/raml08-raml10/source';
	const testFiles = fs.readdirSync(baseDir);
	const converter = new specConverter.Converter(specConverter.Formats.RAML, specConverter.Formats.RAML);

	const testWithData = function (sourceFile, targetFile, extension) {
		const validateOptions = {
			noExtension: !extension,
			fsResolver: myFsResolver,
			format: 'yaml'
		};

		return function (done) {
			converter.convertFile(sourceFile, validateOptions)
				.then(resultRaml => {
					try {
						const notExistsTarget = !fs.existsSync(targetFile);
						if (notExistsTarget) {
							console.log('Content for non existing target file ' + targetFile + '\n.');
							console.log('********** Begin file **********\n');
							console.log(resultRaml);
							console.log('********** Finish file **********\n');
							return done(resultRaml);
						} else {
							const formattedData = typeof resultRaml === 'object' ? JSON.stringify(resultRaml) : resultRaml;
							expect(YAML.safeLoad(formattedData)).to.deep.equal(YAML.safeLoad(fs.readFileSync(targetFile, 'utf8')));
							if (!extension && _.includes(resultRaml, 'x-raml')) {
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
		if (!_.startsWith(testFile, '.')) {
			const extension = _.includes(testFile, 'extension');
			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../target/' + testFile;

			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile, extension));
				}
			} else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile, extension));
			}
		}
	});
});

describe('Raml08 to Oas20', () => {
	const baseDir = __dirname + '/../data/raml08-oas20/source';
	const testFiles = fs.readdirSync(baseDir);
	const converter = new specConverter.Converter(specConverter.Formats.RAML, specConverter.Formats.OAS20);

	const testWithData = function (sourceFile, targetFile, extension) {
		const validateOptions = {
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
		if (!_.startsWith(testFile, '.')) {
			const extension = _.includes(testFile, 'extension');
			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../target/' + testFile;

			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile, extension));
				}
			} else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile, extension));
			}
		}
	});
});

describe('Raml10 to Oas30', () => {
	const baseDir = __dirname + '/../data/raml10-oas30/source';
	const testFiles = fs.readdirSync(baseDir);
	const converter = new specConverter.Converter(specConverter.Formats.RAML, specConverter.Formats.OAS30);

	const testWithData = function (sourceFile, targetFile, extension) {
		const validateOptions = {
			noExtension: !extension,
			fsResolver: myFsResolver,
			format: 'yaml',
			attributeDefaults: false,
			rejectOnErrors: true
		};

		return function (done) {
			const data = fs.readFileSync(sourceFile, 'utf8');
			converter
			.convertData(data, validateOptions)
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
		if (!_.startsWith(testFile, '.')) {
			const extension = _.includes(testFile, 'extension');
			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../target/' + testFile;

			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile, extension));
				}
			} else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile, extension));
			}
		}
	});
});
