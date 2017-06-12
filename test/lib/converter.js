const chai = require('chai'),
	expect = chai.expect,
	specConverter = require('../../index'),
	fs = require('fs'),
	YAML = require('js-yaml'),
	_ = require('lodash'),
	path = require('path');
const beforeEach = require("mocha/lib/mocha.js").beforeEach;
const afterEach = require("mocha/lib/mocha.js").afterEach;
const it = require("mocha/lib/mocha.js").it;
const describe = require("mocha/lib/mocha.js").describe;
const timeout = 60 * 1000; //1000 ms == 1s.

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

describe('Converter', function () {
	let converterInstance, fullPath = __dirname + '/../data/raml-import/raml/raml08.yaml';
	beforeEach(function () {
		converterInstance = new specConverter.NewConverter(specConverter.Formats.RAML10, specConverter.Formats.OAS20);
	});
	afterEach(function () {
		converterInstance = null;
	});
	describe('constructor', function () {
		it('should successfully create new converter instance', function () {
			expect(converterInstance).to.be.an.instanceof(specConverter.NewConverter);
		});
	});
	describe('loadFile', function () {
		it('should successfully load "from"/"importer" compatible file', function (done) {
			converterInstance.loadFile(fullPath).then(() => {
				done();
			});
		});
	});
	
	describe('loadData', function () {
		//current function will work for only stoplight data and postman json data
		it('should successfully load raw data');
		it('should throw error for format incompatible data');
	});
	
	describe('convert', function () {
		it('should successfully convert and return converted data', function (done) {
			converterInstance.loadFile(fullPath)
				.then(() => {
					converterInstance.convert('json')
						.then((returnedData) => {
							expect(returnedData).to.be.an('object');
							expect(returnedData).to.include.keys('swagger');
							expect(returnedData.swagger).to.be.equal('2.0');
							done();
						})
						.catch((err) => {
							done(err)
						})
				})
				.catch((err) => {
					done(err)
				});
		});
	});
});

describe.skip('reversable - from swagger 2 raml 2 swagger', function () {
	const baseDir = __dirname + '/../data/reversable/swagger';
	const testFiles = fs.readdirSync(baseDir);
	const options = {
		expand: false
	};
	
	const testWithData = function (testFile) {
		return function (done) {
			const testFilePath = baseDir + '/' + testFile;
			
			const ramlVersion = _.startsWith(testFile, 'raml08') ? specConverter.Formats.RAML08 : specConverter.Formats.RAML10;
			const swaggerToRamlConverter = new specConverter.Converter(specConverter.Formats.SWAGGER, ramlVersion);
			const ramlToSwaggerConverter = new specConverter.Converter(ramlVersion, specConverter.Formats.SWAGGER);
			
			swaggerToRamlConverter.loadFile(testFilePath)
				.then(() => {
					swaggerToRamlConverter.convert('yaml')
						.then((convertedRAML) => {
							ramlToSwaggerConverter.loadData(convertedRAML, options)
								.then(() => {
									ramlToSwaggerConverter.convert('json', options)
										.then((resultSwagger) => {
											expect(resultSwagger).to.deep.equal(require(testFilePath));
											done();
										})
										.catch((err) => {
											done(err);
										})
								})
								.catch((err) => {
									done(err);
								})
						})
						.catch((err) => {
							done(err);
						})
				})
				.catch((err) => {
					done(err);
				});
		};
	};
	
	testFiles.forEach(function (testFile) {
		if (!_.startsWith(testFile, '.')) {
			it('test: ' + testFile, testWithData(testFile));
		}
	});
});

describe.skip('reversable - from raml 2 swagger 2 raml', function () {
	const baseDir = __dirname + '/../data/reversable/raml';
	const testFiles = fs.readdirSync(baseDir);
	
	const testWithData = function (testFile) {
		return function (done) {
			const testFilePath = baseDir + '/' + testFile;
			
			const ramlVersion = _.includes(testFile, 'raml08') ? specConverter.Formats.RAML08 : specConverter.Formats.RAML10;
			const ramlToSwaggerConverter = new specConverter.Converter(ramlVersion, specConverter.Formats.SWAGGER);
			const swaggerToRamlConverter = new specConverter.Converter(specConverter.Formats.SWAGGER, ramlVersion);

			ramlToSwaggerConverter.loadFile(testFilePath)
				.then(() => {
					ramlToSwaggerConverter.convert('json')
						.then((resultSwagger) => {
							swaggerToRamlConverter.loadData(JSON.stringify(resultSwagger))
								.then(() => {
									swaggerToRamlConverter.convert('yaml')
										.then((convertedRAML) => {
											expect(YAML.safeLoad(convertedRAML)).to.deep.equal(YAML.safeLoad(fs.readFileSync(testFilePath, 'utf8')));
											done();
										})
										.catch((err) => {
											done(err);
										})
								})
								.catch((err) => {
									done(err);
								})
						})
						.catch((err) => {
							done(err);
						})
				})
				.catch((err) => {
					done(err);
				});
		};
	};
	
	testFiles.forEach(function (testFile) {
		if (!_.startsWith(testFile, '.') && !_.includes(testFile, 'ignore')) {
			it('test: ' + testFile, testWithData(testFile));
		}
	});
});

describe('from swagger to raml', function () {
	const baseDir = __dirname + '/../data/swagger-import/swagger';
	const testFiles = fs.readdirSync(baseDir);
	const converter = new specConverter.NewConverter(specConverter.Formats.OAS20, specConverter.Formats.RAML10);
	
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
		const converter = new specConverter.NewConverter(specConverter.Formats.RAML10, specConverter.Formats.OAS20);
		
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