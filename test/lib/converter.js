var chai   = require('chai'),
    expect = chai.expect,
    specConverter = require('../../index'),
    fs = require('fs'),
    YAML = require('js-yaml'),
		_ = require('lodash'),
		path = require('path');

chai.use(require('chai-string'));

describe('Converter', function() {
  var converterInstance, fullPath = __dirname + '/../data/raml-import/raml/raml08.yaml';
  beforeEach(function(){
    converterInstance = new specConverter.Converter(specConverter.Formats.RAML08, specConverter.Formats.SWAGGER);
  });
  afterEach(function(){
    converterInstance = null;
  });
  describe('constructor', function(){
    it('should successfully create new converter instance', function(){
      expect(converterInstance).to.be.an.instanceof(specConverter.Converter);
    });
    it('should validate from format, throw error otherwise', function(done){
      try{
        //set up a fake format
        specConverter.Formats.ABCD = {
          name: 'ABCD',
          className: 'ABCD'
        };

        //doesn't support export/convert from abcd format
        var newConverterInstance = new specConverter.Converter(specConverter.Formats.ABCD, specConverter.Formats.POSTMAN);
        expect(newConverterInstance).to.be.an.instanceof(specConverter.Converter);
      } catch(e) {
        expect(e.message).to.equal('from format ABCD not supported');
        done();
      }
    });
    it('should validate to format, throw error otherwise', function(done){
      try{
        //doesn't support export/convert to postman format
        var newConverterInstance = new specConverter.Converter(specConverter.Formats.RAML08, specConverter.Formats.POSTMAN);
        expect(newConverterInstance).to.be.an.instanceof(specConverter.Converter);
      } catch(e) {
        expect(e.message).to.equal('to format Postman not supported');
        done();
      }
    });
  });
  describe('loadFile', function(){
    it('should successfully load "from"/"importer" comaptible file', function(done){
      converterInstance.loadFile(fullPath, function(){
        done();
      });
    });
    it('should throw error for format incompatible file', function(done){
      converterInstance.loadFile(__dirname + '/../data/postman.json', function(err) {
        expect(err).to.not.be.undefined;
        expect(err).to.be.instanceof(Error);
        done();
      });
    });
  });

  describe('loadData', function(){
    //current function will work for only stoplight data and postman json data
    it('should successfully load raw data');
    it('should throw error for format incompatible data');
  });

  describe('convert', function(){
    it('should successfully convert and return converted data', function(done){
      converterInstance.loadFile(fullPath, function(err){
        if(err)return done(err);
        converterInstance.convert('json')
        .then(function(returnedData){
          expect(returnedData).to.be.an('object');
          expect(returnedData).to.include.keys('swagger');
          expect(returnedData.swagger).to.be.equal('2.0');
          done();
        })
        .catch(done);
      });
    });
    it('converting from stoplightx to stoplightx format should be identical', function(done) {
      var path = __dirname + '/../data/stoplightx.json';
      var originalData = require(path);
      var newConverterInstance = new specConverter.Converter(specConverter.Formats.STOPLIGHTX, specConverter.Formats.STOPLIGHTX);

      newConverterInstance.loadFile(path, function(err) {
        if (err) {
          return done(err);
        }

				newConverterInstance.convert('json', function(err, convertedData) {
					if (err) {
						done(err);
					}

					expect(JSON.parse(JSON.stringify(convertedData))).to.deep.equal(originalData);
					done();
				});
      });
    });

    // This test has an issue because RAML does not support operationIds
    // It performs importing from raml to stoplight and exporting from stoplight to raml
    // and thus verifies in both ways
    // it('converting from raml to raml format should be identical', function(done){

    //   //This test include swagger file that is fully compatible with sl spec.
    //   //Of course, for some specific properties, librart usually skips and won't import, these
    //   //will be documented/listed on library docs

    //   var path = __dirname + '/../data/raml.yaml';
    //   var originalData = fs.readFileSync(path, 'utf8');
    //   var newConverterInstance = new specConverter.Converter(specConverter.Formats.RAML, specConverter.Formats.RAML);
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
    //   var converter = new specConverter.Converter(specConverter.Formats.RAML, specConverter.Formats.SWAGGER);
    //   var ramlPath = __dirname + '/../data/swagger-compatible-raml.yaml';
    //   converter.loadFile(ramlPath, function(){
    //     try{
    //       converter.convert('yaml', function(err, covertedSwagger){
    //         if(err)return done(err);
    //         var converter2 = new specConverter.Converter(specConverter.Formats.SWAGGER, specConverter.Formats.RAML);
    //         converter2.loadData(covertedSwagger)
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
	var baseDir = __dirname + '/../data/reversable/swagger';
	var testFiles = fs.readdirSync(baseDir);

	var testWithData = function (testFile) {
    return function (done) {
			var testFilePath = baseDir + '/' + testFile;

			var ramlVersion = _.startsWith(testFile, 'raml08') ? specConverter.Formats.RAML08 : specConverter.Formats.RAML10;
			var swaggerToRamlConverter = new specConverter.Converter(specConverter.Formats.SWAGGER, ramlVersion);
			var ramlToSwaggerConverter = new specConverter.Converter(ramlVersion,  specConverter.Formats.SWAGGER);

			swaggerToRamlConverter.loadFile(testFilePath, function(){
				swaggerToRamlConverter.convert('yaml', function(err, covertedRAML){
					if (err)return done(err);
					ramlToSwaggerConverter.loadData(covertedRAML)
						.then(function(){
							ramlToSwaggerConverter.convert('json', function(err, resultSwagger){
								if(err)return done(err);
								expect(resultSwagger).to.deep.equal(require(testFilePath));
								done();
							});
						})
						.catch(done);
				});
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
	var baseDir = __dirname + '/../data/reversable/raml';
	var testFiles = fs.readdirSync(baseDir);

	var testWithData = function (testFile) {
		return function (done) {
			var testFilePath = baseDir + '/' + testFile;

			var ramlVersion = _.includes(testFile, 'raml08') ? specConverter.Formats.RAML08 : specConverter.Formats.RAML10;
			var ramlToSwaggerConverter = new specConverter.Converter(ramlVersion,  specConverter.Formats.SWAGGER);
			var swaggerToRamlConverter = new specConverter.Converter(specConverter.Formats.SWAGGER, ramlVersion);

			ramlToSwaggerConverter.loadFile(testFilePath, function(){
				ramlToSwaggerConverter.convert('json', function(err, resultSwagger){
					if (err)return done(err);
					swaggerToRamlConverter.loadData(JSON.stringify(resultSwagger))
						.then(function(){
							swaggerToRamlConverter.convert('yaml', function(err, covertedRAML){
								if(err)return done(err);
								expect(YAML.safeLoad(covertedRAML)).to.deep.equal(YAML.safeLoad(fs.readFileSync(testFilePath, 'utf8')));
								done();
							});
						})
						.catch(done);
				});
			});
		};
	};

	testFiles.forEach(function (testFile) {
		if (!_.startsWith(testFile, '.')) {
      it('test: ' + testFile, testWithData(testFile));
    }
	});
});

describe('from swagger to raml', function () {
	var baseDir = __dirname + '/../data/swagger-import/swagger';
	var testFiles = fs.readdirSync(baseDir);

	var testWithData = function (sourceFile, targetFile, stringCompare) {
		return function (done) {
      var ramlVersion = _.includes(sourceFile, 'raml08') ? specConverter.Formats.RAML08 : specConverter.Formats.RAML10;
			var converter = new specConverter.Converter(specConverter.Formats.SWAGGER, ramlVersion);
			converter.loadFile(sourceFile, function(){

				converter.convert('yaml', function(err, covertedRAML){
					if (err)return done(err);
					
					var notExistsTarget = !fs.existsSync(targetFile);
					
					if (notExistsTarget) {
						console.log('Content for non existing target file ' + targetFile + '\n.');
						console.log('********** Begin file **********\n');
						console.log(covertedRAML);
						console.log('********** Finish file **********\n');
	
						done(err);
					}
	
					if (stringCompare == true) {
						expect(covertedRAML).to.deep.equal(fs.readFileSync(targetFile, 'utf8'));
					} else {
						expect(YAML.safeLoad(covertedRAML)).to.deep.equal(YAML.safeLoad(fs.readFileSync(targetFile, 'utf8')));
					}
	
					done();
				});
			});
		};
	};

	testFiles.forEach(function (testFile) {
    if (!_.startsWith(testFile, '.')) {
  		var sourceFile = baseDir + '/' + testFile;
  		var targetFile = baseDir + '/../raml/' + _.replace(testFile, 'json', 'yaml');

  		if (process.env.fileToTest) {
  			if (_.endsWith(sourceFile, process.env.fileToTest)) {
  				it('test: ' + testFile, testWithData(sourceFile, targetFile, false));
  			}
  		}
  		else {
  			it('test: ' + testFile, testWithData(sourceFile, targetFile, false));
  		}
    }
	});

	if (!process.env.fileToTest) {
		it('should convert from swagger petstore with external refs to raml 1.0',
			testWithData(__dirname + '/../data/petstore-separate/spec/swagger.json', __dirname + '/../data/petstore-separate/spec/raml10.yaml', true));
	}
});

describe('from raml to swagger', function () {
	var baseDir = __dirname + '/../data/raml-import/raml';
	var testFiles = fs.readdirSync(baseDir);

	var myFsResolver = {
		content: function (filePath) {},
		contentAsync: function (filePath) {
			return new Promise(function(resolve, reject){
				try {
					var p = path.parse(filePath);

					if (p.dir.indexOf('types') > 0) {
						var baseDir = p.dir.replace('types', '../../types/');
						var fileName = p.base === 'Person.xyz' ? 'Person.json' : p.base;

						resolve(fs.readFileSync(baseDir + fileName, 'UTF8'));

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

	var myOptions = {
		fsResolver : myFsResolver
	};

	var testWithData = function (testFile) {
		return function (done) {
			var testFilePath = baseDir + '/' + testFile;
			var ramlVersion = _.startsWith(testFile, 'raml08') ? specConverter.Formats.RAML08 : specConverter.Formats.RAML10;
			var converter = new specConverter.Converter(ramlVersion, specConverter.Formats.SWAGGER);
			converter.loadFileWithOptions(testFilePath, myOptions, function() {
				converter.convert('json', function(err, resultSwagger){
					if (err)return done(err);
					var targetFile = baseDir + '/../swagger/' + _.replace(testFile, 'yaml', 'json');
					
					var notExistsTarget = !fs.existsSync(targetFile);
					if (notExistsTarget) {
						console.log('Content for non existing target file ' + targetFile + '\n.');
						console.log('********** Begin file **********\n');
						console.log(JSON.stringify(resultSwagger));
						console.log('********** Finish file **********\n');
						done(err);
					} else {
						expect(resultSwagger).to.deep.equal(require(targetFile));
						done();
					}
				});
			});
		};
	};

	testFiles.forEach(function (testFile) {
    if (!_.startsWith(testFile, '.')) {
  		if (process.env.fileToTest) {
  			if (_.endsWith(testFile, process.env.fileToTest)) {
  				it('test: ' + testFile, testWithData(testFile));
  			}
  		} else {
  			it('test: ' + testFile, testWithData(testFile));
  		}
    }
	});
});
