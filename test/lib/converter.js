const chai = require('chai'),
	expect = chai.expect,
	specConverter = require('../../index'),
	fs = require('fs'),
	YAML = require('js-yaml'),
	_ = require('lodash'),
	path = require('path'),
    urlHelper = require('../../lib/utils/url');
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
		let path = __dirname + '/..' + filePathMap[filePath]; ///Users/gaston/mulesoft/api-spec-converter/test/lib
		return fs.readFileSync(path, 'UTF8');
	},
	contentAsync: function (filePath) {
		return new Promise(function (resolve, reject) {
			try {
				let p = path.parse(filePath);
				
				if (p.dir.indexOf('types') > 0) {
					let fileName = p.base === 'Person.xyz' ? 'Person.json' : p.base;
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
		it('should validate from format, throw error otherwise', function (done) {
			try {
				//set up a fake format
				specConverter.Formats.ABCD = {
					name: 'ABCD',
					className: 'ABCD'
				};
				
				//doesn't support export/convert from abcd format
				let newConverterInstance = new specConverter.Converter(specConverter.Formats.ABCD, specConverter.Formats.POSTMAN);
				expect(newConverterInstance).to.be.an.instanceof(specConverter.Converter);
			} catch (e) {
				expect(e.message).to.equal('from format ABCD not supported');
				done();
			}
		});
		it('should validate to format, throw error otherwise', function (done) {
			try {
				//doesn't support export/convert to postman format
				let newConverterInstance = new specConverter.Converter(specConverter.Formats.RAML08, specConverter.Formats.POSTMAN);
				expect(newConverterInstance).to.be.an.instanceof(specConverter.Converter);
			} catch (e) {
				expect(e.message).to.equal('to format Postman not supported');
				done();
			}
		});
	});
	describe('loadFile', function () {
		it('should successfully load "from"/"importer" compatible file', function (done) {
			converterInstance.loadFile(fullPath).then(() => {
				done();
			});
		});
		it('should throw error for format incompatible file', function (done) {
			converterInstance.loadFile(__dirname + '/../data/postman.json').catch((err) => {
				expect(err).to.not.be.undefined;
				expect(err).to.be.instanceof(Error);
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
		it('converting from stoplightx to stoplightx format should be identical', function (done) {
			let path = __dirname + '/../data/stoplightx.json';
			let originalData = require(path);
			let newConverterInstance = new specConverter.Converter(specConverter.Formats.STOPLIGHTX, specConverter.Formats.STOPLIGHTX);
			newConverterInstance.loadFile(path)
				.then(() => {
					newConverterInstance.convert('json')
						.then((convertedData) => {
							expect(JSON.parse(JSON.stringify(convertedData))).to.deep.equal(originalData);
							done();
						})
						.catch((err) => {
							done(err);
						})
				})
				.catch((err) => {
					done(err);
				});
		});
		
		// This test has an issue because RAML does not support operationIds
		// It performs importing from raml to stoplight and exporting from stoplight to raml
		// and thus verifies in both ways
		// it('converting from raml to raml format should be identical', function(done){
		
		//   //This test include swagger file that is fully compatible with sl spec.
		//   //Of course, for some specific properties, librart usually skips and won't import, these
		//   //will be documented/listed on library docs
		
		//   let path = __dirname + '/../data/raml.yaml';
		//   let originalData = fs.readFileSync(path, 'utf8');
		//   let newConverterInstance = new specConverter.Converter(specConverter.Formats.RAML, specConverter.Formats.RAML);
		//   newConverterInstance.loadData(originalData)
		//   .then(function(){
		//     try {
		//       newConverterInstance.convert('yaml', function(err, convertedData){
		//         if(err)return done(err);
		//         expect(YAML.safeLoad(originalData)).to.deep.equal(YAML.safeLoad(convertedData));
		//         done();
		//       });
		//     }
		//     catch(err) {
		//       done(err);
		//     }
		//   })
		//   .catch(done);
		// });
		
		// This test has an issue because RAML does not support operationIds
		// it('should convert reversly from raml to swagger without loss', function(done){
		//   let converter = new specConverter.Converter(specConverter.Formats.RAML, specConverter.Formats.SWAGGER);
		//   let ramlPath = __dirname + '/../data/swagger-compatible-raml.yaml';
		//   converter.loadFile(ramlPath, function(){
		//     try{
		//       converter.convert('yaml', function(err, convertedSwagger){
		//         if(err)return done(err);
		//         let converter2 = new specConverter.Converter(specConverter.Formats.SWAGGER, specConverter.Formats.RAML);
		//         converter2.loadData(convertedSwagger)
		//         .then(function(){
		//           try{
		//             converter2.convert('yaml', function(err, resultRAML){
		//               if(err)return done(err);
		//               expect(YAML.safeLoad(resultRAML)).to.deep.equal(YAML.safeLoad(fs.readFileSync(ramlPath, 'utf8')));
		//               done();
		//             });
		//           }
		//           catch(err) {
		//             done(err);
		//           }
		//         })
		//         .catch(done);
		//       });
		//     }
		//     catch(err) {
		//       done(err);
		//     }
		//   });
		// });
	});
});


describe('reversable - from swagger 2 raml 2 swagger', function () {
	let baseDir = __dirname + '/../data/reversable/swagger';
	let testFiles = fs.readdirSync(baseDir);
	let options = {
		expand: false
	};
	
	let testWithData = function (testFile) {
		return function (done) {
			let testFilePath = baseDir + '/' + testFile;
			
			let ramlVersion = _.startsWith(testFile, 'raml08') ? specConverter.Formats.RAML08 : specConverter.Formats.RAML10;
			let swaggerToRamlConverter = new specConverter.Converter(specConverter.Formats.SWAGGER, ramlVersion);
			let ramlToSwaggerConverter = new specConverter.Converter(ramlVersion, specConverter.Formats.SWAGGER);
			
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
	let baseDir = __dirname + '/../data/reversable/raml';
	let testFiles = fs.readdirSync(baseDir);
	
	let testWithData = function (testFile) {
		return function (done) {
			let testFilePath = baseDir + '/' + testFile;
			
			let ramlVersion = _.includes(testFile, 'raml08') ? specConverter.Formats.RAML08 : specConverter.Formats.RAML10;
			let ramlToSwaggerConverter = new specConverter.Converter(ramlVersion, specConverter.Formats.SWAGGER);
			let swaggerToRamlConverter = new specConverter.Converter(specConverter.Formats.SWAGGER, ramlVersion);
			
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
	let baseDir = __dirname + '/../data/swagger-import/swagger';
	let testFiles = fs.readdirSync(baseDir);
	
	let testWithData = function (sourceFile, targetFile, stringCompare, validate) {
		
		return function (done) {
			let ramlVersion = _.includes(sourceFile, 'raml08') ? specConverter.Formats.RAML08 : specConverter.Formats.RAML10;
			let converter = new specConverter.Converter(specConverter.Formats.SWAGGER, ramlVersion);
			let validateOptions = {
				validate: validate,
				fsResolver: myFsResolver
			};
			converter.convertFile(sourceFile, validateOptions).then((convertedRAML) => {
				let notExistsTarget = !fs.existsSync(targetFile);

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
			let sourceFile = baseDir + '/' + testFile;
			let targetFile = baseDir + '/../raml/' + _.replace(testFile, 'json', 'yaml');
			let stringCompare = _.includes(testFile, 'stringcompare');
			let validate = !_.includes(testFile, 'novalidate');
			
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
	let baseDir = __dirname + '/../data/raml-import/raml';
	let testFiles = fs.readdirSync(baseDir);
	
	let testWithData = function (testFile, validate) {
		let validateOptions = {
			validate: validate,
			fsResolver: myFsResolver
		};
		
		return function (done) {
			let testFilePath = baseDir + '/' + testFile;
			let ramlVersion = _.startsWith(testFile, 'raml08') ? specConverter.Formats.RAML08 : specConverter.Formats.RAML10;
			let converter = new specConverter.Converter(ramlVersion, specConverter.Formats.SWAGGER);
			converter.convertFile(testFilePath, validateOptions)
				.then(resultSwagger => {

					try {
						let targetFile = baseDir + '/../swagger/' + _.replace(testFile, 'yaml', 'json');

						let notExistsTarget = !fs.existsSync(targetFile);
						if (notExistsTarget) {
							let data = JSON.stringify(resultSwagger);
							console.log('Content for non existing target file ' + targetFile + '\n.');
							console.log('********** Begin file **********\n');
							console.log(data);
							console.log('********** Finish file **********\n');
							return done(data);
						} else {
							expect(resultSwagger).to.deep.equal(require(targetFile));
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
			let validate = !_.includes(testFile, 'novalidate');
			let skip = _.includes(testFile, 'skip');
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

describe.skip('from swagger to raml: apis-guru', function () {
	const baseDir = __dirname + '/../data/apis-guru/swagger';
  const testFiles = fs.readdirSync(baseDir);
	
	const excluded = [
		'watchful.li1.0.0swagger.json',
		'versioneye.comv2swagger.json',
		'uploady.comv1-betaswagger.json'
	]
	const excludedValidation = [
		'azure.comarm-insights2015-07-01swagger.json',
		'azure.comarm-insights2016-03-01swagger.json'
	]
	
	let testWithData = (sourceFile, targetFile, validate) => done =>{
    const converter = new specConverter.Converter(specConverter.Formats.SWAGGER, specConverter.Formats.RAML10);
    const validateOptions = {
      validate: validate,
      fsResolver: myFsResolver
    };
    converter.convertFile(sourceFile, validateOptions).then((convertedRAML) => {
      let notExistsTarget = !fs.existsSync(targetFile);

      if (notExistsTarget) {
        fs.writeFileSync(targetFile, convertedRAML);
        // console.log('Content for non existing target file ' + targetFile + '\n.');
        // console.log('********** Begin file **********\n');
        // console.log(convertedRAML);
        // console.log('********** Finish file **********\n');
        // done('Error');
      }

      try {
        expect(YAML.safeLoad(convertedRAML)).to.deep.equal(YAML.safeLoad(fs.readFileSync(targetFile, 'utf8')));
        console.log('********** Begin file **********\n');
        console.log(convertedRAML);
        console.log('********** Finish file **********\n');
        done();
      } catch (e) {
        done(e);
      }
    }).catch((err) => {
      console.log(`Invalid export for file ${sourceFile}`);
      console.log('********** Begin file **********\n');
      console.log(err.exportedData);
      console.log('********** Finish file **********\n');
      done(err);
    });
  };
	
	testFiles.forEach(function (testFile) {
		if (!_.startsWith(testFile, '.') && !excluded.includes(testFile)) {
      const sourceFile = baseDir + '/' + testFile;
      const targetFile = baseDir + '/../raml/' + _.replace(testFile, 'json', 'raml');
      const validate = !excludedValidation.includes(testFile);
			
			if (process.env.fileToTest) {
				if (_.endsWith(sourceFile, process.env.fileToTest)) {
					xit('test: ' + testFile, testWithData(sourceFile, targetFile, validate));
				}
			}
			else {
				xit('test: ' + testFile, testWithData(sourceFile, targetFile, validate));
			}
		}
	});
});


describe.skip('from raml to swagger: platform + examples', function () {
  const baseDir = __dirname + '/../data/apis-raml/raml';
  const testFiles = fs.readdirSync(baseDir);

  const excludedValidation = []

  let testWithData = (sourceFile, targetFile, validate) => done =>{
    const converter = new specConverter.Converter(specConverter.Formats.RAML10, specConverter.Formats.SWAGGER);
    const validateOptions = {
      validate: validate
    };
    converter.convertFile(sourceFile, validateOptions).then((resultSwagger) => {
      try {
        const targetFile = baseDir + '/../swagger/' + _.replace(testFile, 'yaml', 'json');
        const notExistsTarget = !fs.existsSync(targetFile);
        if (notExistsTarget) {
          const data = JSON.stringify(resultSwagger);
          fs.writeFileSync(targetFile, data);
          // console.log('Content for non existing target file ' + targetFile + '\n.');
          // console.log('********** Begin file **********\n');
          // console.log(data);
          // console.log('********** Finish file **********\n');
          // return done(data);
        }

        expect(resultSwagger).to.deep.equal(require(targetFile));
        done();
      } catch (e) {
        done(e);
      }
    }).catch((err) => {
      console.log(`Invalid export for file ${sourceFile}`);
      console.log('********** Begin file **********\n');
      console.log(err.exportedData);
      console.log('********** Finish file **********\n');
      done(err);
    });
  };

  testFiles.forEach(function (testFile) {
    if (!_.startsWith(testFile, '.')) {
      const sourceFile = baseDir + '/' + testFile + '/api.raml';
      const targetFile = baseDir + '/../swagger/api.json';
      const validate = !excludedValidation.includes(testFile);

      if (process.env.fileToTest) {
        if (_.endsWith(sourceFile, process.env.fileToTest)) {
          xit('test: ' + testFile, testWithData(sourceFile, targetFile, validate));
        }
      }
      else {
        xit('test: ' + testFile, testWithData(sourceFile, targetFile, validate));
      }
    }
  });
});