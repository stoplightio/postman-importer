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
		converterInstance = new specConverter.Converter(specConverter.Formats.RAML08, specConverter.Formats.SWAGGER);
	});
	afterEach(function () {
		converterInstance = null;
	});
	describe('constructor', function () {
		it('should successfully create new converter instance', function () {
			expect(converterInstance).to.be.an.instanceof(specConverter.Converter);
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


describe('reversable - from swagger 2 raml 2 swagger', function () {
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
									ramlToSwaggerConverter.convert('json')
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


describe('reversable - from raml 2 swagger 2 raml', function () {
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
	
	const testWithData = function (sourceFile, targetFile, stringCompare, validate) {
		
		return function (done) {
			const ramlVersion = _.includes(sourceFile, 'raml08') ? specConverter.Formats.RAML08 : specConverter.Formats.RAML10;
			const converter = new specConverter.Converter(specConverter.Formats.SWAGGER, ramlVersion);
			const validateOptions = {
				validate: validate,
				fsResolver: myFsResolver
			};
			converter.convertFile(sourceFile, validateOptions).then((convertedRAML) => {
				const notExistsTarget = !fs.existsSync(targetFile);

				if (notExistsTarget) {
					console.log('Content for non existing target file ' + targetFile + '\n.');
					console.log('********** Begin file **********\n');
					console.log(convertedRAML);
					console.log('********** Finish file **********\n');

					done('Error');
				}

				try {
					if (stringCompare == true) {
						expect(convertedRAML).to.deep.equal(fs.readFileSync(targetFile, 'utf8'));
					} else {
						expect(YAML.safeLoad(convertedRAML)).to.deep.equal(YAML.safeLoad(fs.readFileSync(targetFile, 'utf8')));
					}
					done();
				} catch (e) {
					done(e);
				}
			}).catch((err) => {
				console.log('Error exporting file.');
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
			
			if (process.env.fileToTest) {
				if (_.endsWith(sourceFile, process.env.fileToTest)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile, stringCompare, validate));
				}
			}
			else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile, stringCompare, validate));
			}
		}
	});
	
	if (!process.env.fileToTest) {
		it('should convert from swagger petstore with external refs to raml 1.0',
			testWithData(__dirname + '/../data/petstore-separate/spec/swagger.json', __dirname + '/../data/petstore-separate/spec/raml10.yaml', true));
	}
});

describe('from raml to swagger', function () {
	const baseDir = __dirname + '/../data/raml-import/raml';
	const testFiles = fs.readdirSync(baseDir);
	
	const testWithData = function (testFile, validate) {
		const validateOptions = {
			validate: validate,
			fsResolver: myFsResolver,
			format: 'yaml'
		};
		
		return function (done) {
			const testFilePath = baseDir + '/' + testFile;
			const ramlVersion = _.startsWith(testFile, 'raml08') ? specConverter.Formats.RAML08 : specConverter.Formats.RAML10;
			const converter = new specConverter.Converter(ramlVersion, specConverter.Formats.SWAGGER);
			converter.convertFile(testFilePath, validateOptions)
				.then(resultSwagger => {

					try {
						const targetFile = baseDir + '/../swagger/' + testFile;

						const notExistsTarget = !fs.existsSync(targetFile);
						if (notExistsTarget) {
							const data = resultSwagger;
							console.log('Content for non existing target file ' + targetFile + '\n.');
							console.log('********** Begin file **********\n');
							console.log(data);
							console.log('********** Finish file **********\n');
							return done(data);
						} else {
							expect(YAML.safeLoad(resultSwagger)).to.deep.equal(YAML.safeLoad(fs.readFileSync(targetFile, 'utf8')));
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
			if (skip) return ;
			if (process.env.fileToTest) {
				if (_.endsWith(testFile, process.env.fileToTest)) {
					it('test: ' + testFile, testWithData(testFile, validate));
				}
			} else {
				it('test: ' + testFile, testWithData(testFile, validate));
			}
		}
	});
});