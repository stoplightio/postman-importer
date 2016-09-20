var chai   = require('chai'),
    expect = chai.expect,
    specConverter = require('../../index'),
    fs = require('fs'),
    YAML = require('js-yaml');

chai.use(require('chai-string'));

describe('Converter', function() {
  var converterInstance, fullPath = __dirname + '/../data/raml08.yaml';
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
      converterInstance.loadFile(__dirname + '/../data/postman.json', function(err){
        expect(err).to.not.be.undefined;
        expect(err).to.be.instanceof(Error);
        expect(err.message).to.equal("Invalid first line. A RAML document is expected to start with '#%RAML <version> <?fragment type>'.");
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

        try {
          newConverterInstance.convert('json', function(err, convertedData) {
            if (err) {
              return done(err);
            }

            expect(JSON.parse(JSON.stringify(convertedData))).to.deep.equal(originalData);
            done();
          });
        } catch (err) {
          done(err);
        }
      });
    });

    it('should convert reversly from swagger to raml 10 without loss', function(done){
      var converter = new specConverter.Converter(specConverter.Formats.SWAGGER, specConverter.Formats.RAML10);
      converter.loadFile(__dirname + '/../data/raml10-compatible-swagger.json', function(){
        try{
          converter.convert('yaml', function(err, covertedRAML){
            if (err)return done(err);
            var converter2 = new specConverter.Converter(specConverter.Formats.RAML10, specConverter.Formats.SWAGGER);
            converter2.loadData(covertedRAML)
            .then(function(){
              try{
                converter2.convert('json', function(err, resultSwagger){
                  if(err)return done(err);
                  expect(resultSwagger).to.deep.equal(require(__dirname + '/../data/raml10-compatible-swagger.json'));
                  done();
                });
              }
              catch(err) {
                done(err);
              }
            })
            .catch(done);
          });
        }
        catch(err) {
          done(err);
        }
      });
    });

    it('should convert reversly from swagger to raml 08 without loss', function(done){
      var converter = new specConverter.Converter(specConverter.Formats.SWAGGER, specConverter.Formats.RAML08);
      converter.loadFile(__dirname + '/../data/raml08-compatible-swagger.json', function(){
        try{
          converter.convert('yaml', function(err, covertedRAML){
            if (err)return done(err);
            var converter2 = new specConverter.Converter(specConverter.Formats.RAML08, specConverter.Formats.SWAGGER);
            converter2.loadData(covertedRAML)
                .then(function(){
                  try{
                    converter2.convert('json', function(err, resultSwagger){
                      if(err)return done(err);
                      expect(resultSwagger).to.deep.equal(require(__dirname + '/../data/raml08-compatible-swagger.json'));
                      done();
                    });
                  }
                  catch(err) {
                    done(err);
                  }
                })
                .catch(done);
          });
        }
        catch(err) {
          done(err);
        }
      });
    });

    it('should convert from swagger to raml 1.0', function(done){
      var converter = new specConverter.Converter(specConverter.Formats.SWAGGER, specConverter.Formats.RAML10);
      converter.loadFile(__dirname + '/../data/raml10-compatible-swagger.json', function(){
        try{
          converter.convert('yaml', function(err, covertedRAML){
            if (err)return done(err);
            expect(YAML.safeLoad(covertedRAML)).to.deep.equal(YAML.safeLoad(fs.readFileSync(__dirname + '/../data/swagger-compatible-raml10.yaml', 'utf8')));
            done();
          });
        }
        catch(err) {
          done(err);
        }
      });
    });

    it('should convert from swagger ref to raml 1.0', function(done){
      var converter = new specConverter.Converter(specConverter.Formats.SWAGGER, specConverter.Formats.RAML10);
      converter.loadFile(__dirname + '/../data/swagger-ref.json', function(){
        try{
          converter.convert('yaml', function(err, covertedRAML){
            if (err)return done(err);
            expect(YAML.safeLoad(covertedRAML)).to.deep.equal(YAML.safeLoad(fs.readFileSync(__dirname + '/../data/raml10-ref.yaml', 'utf8')));
            done();
          });
        }
        catch(err) {
          done(err);
        }
      });
    });

    it('should convert from raml 1.0 to swagger ref', function(done){
      var converter = new specConverter.Converter(specConverter.Formats.RAML10, specConverter.Formats.SWAGGER);
      converter.loadFile(__dirname + '/../data/raml10-ref.yaml', function(){
        try{
          converter.convert('json', function(err, resultSwagger){
            if (err)return done(err);
            expect(resultSwagger).to.deep.equal(require(__dirname + '/../data/swagger-ref.json'));
            done();
          });
        }
        catch(err) {
          done(err);
        }
      });
    });

    it('should convert from swagger with info object to raml 1.0', function(done){
      var converter = new specConverter.Converter(specConverter.Formats.SWAGGER, specConverter.Formats.RAML10);
      converter.loadFile(__dirname + '/../data/swagger-with-info.json', function(){
      try{
        converter.convert('yaml', function(err, covertedRAML){
        if (err)return done(err);
          expect(YAML.safeLoad(covertedRAML)).to.deep.equal(YAML.safeLoad(fs.readFileSync(__dirname + '/../data/raml10-with-info.yaml', 'utf8')));
          done();
        });
      }
      catch(err) {
        done(err);
      }
      });
    });
	
		it('should convert from swagger with security into to raml 1.0', function(done){
			var converter = new specConverter.Converter(specConverter.Formats.SWAGGER, specConverter.Formats.RAML10);
			converter.loadFile(__dirname + '/../data/swagger_security_conversion.json', function(){
				try{
					converter.convert('yaml', function(err, covertedRAML){
						if (err)return done(err);
						expect(YAML.safeLoad(covertedRAML)).to.deep.equal(YAML.safeLoad(fs.readFileSync(__dirname + '/../data/raml_security_conversion.yaml', 'utf8')));
						done();
					});
				}
				catch(err) {
					done(err);
				}
			});
		});

    it('should convert from swagger petstore with external refs to raml 1.0', function(done){
      var converter = new specConverter.Converter(specConverter.Formats.SWAGGER, specConverter.Formats.RAML10);

      try {
        converter.loadFile(__dirname + '/../data/petstore-separate/spec/swagger.json', function () {
          try {
            converter.convert('yaml', function (err, covertedRAML) {
              if (err)return done(err);
              expect(covertedRAML).to.deep.equal(fs.readFileSync(__dirname + '/../data/petstore-separate/raml10.yaml', 'utf8'));
              done();
            });
          }
          catch (err) {
            done(err);
          }
        });
      } catch(err) {
        done(err);
      }
    });

    it('should convert from swagger petstore to raml 1.0', function(done){
      var converter = new specConverter.Converter(specConverter.Formats.SWAGGER, specConverter.Formats.RAML10);

      try {
        converter.loadFile(__dirname + '/../data/petstore.json', function () {
          try {
            converter.convert('yaml', function (err, covertedRAML) {
              if (err)return done(err);
              expect(covertedRAML).to.deep.equal(fs.readFileSync(__dirname + '/../data/petstore-raml10.yaml', 'utf8'));
              done();
            });
          }
          catch (err) {
            done(err);
          }
        });
      } catch(err) {
        done(err);
      }
    });

    it('should convert from swagger petstore data to raml 1.0', function(done) {
      var converter = new specConverter.Converter(specConverter.Formats.SWAGGER, specConverter.Formats.RAML10);

      var petStoreStr = fs.readFileSync(__dirname + '/../data/petstore.json');

      converter.loadData(petStoreStr).then(function () {
        try {
          converter.convert('yaml', function (err, covertedRAML) {
            if (err)return done(err);
            expect(covertedRAML).to.deep.equal(fs.readFileSync(__dirname + '/../data/petstore-raml10.yaml', 'utf8'));
            done();
          });
        }
        catch (err) {
          done(err);
        }
      }).catch(function (err) {
        done(err);
      });
    });

    // This test has an issue because RAML does not support operationIds
    //It performs importing from raml to stoplight and exporting from stoplight to raml
    //and thus verifies in both ways
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
