# API Spec Transformer [![Build Status](https://travis-ci.org/stoplightio/api-spec-converter.svg)](https://travis-ci.org/stoplightio/api-spec-converter) [![Coverage Status](https://coveralls.io/repos/stoplightio/api-spec-converter/badge.svg?branch=master&service=github)](https://coveralls.io/github/stoplightio/api-spec-converter?branch=master)

This package helps to convert between different API specifications. It currently supports OAS (Swagger 2), RAML 0.8, RAML 1.0, and Postman collections.

This package is used in production @ [https://stoplight.io](https://stoplight.io). If you are using this package in production, please let us know and we will link you.

## Note

A prior version of this library was available, but not published on NPM. If you are directly referencing the git URL in your package.json files, please update them to use the `api-spec-transformer` package name, instead of `https://github.com/stoplightio/api-spec-converter`. We will be re-naming the git repository to `https://github.com/stoplightio/api-spec-transformer` in the near future.

## Installation

### NodeJS or Browser

```bash
npm install --save api-spec-transformer
```

## Command line tool

```
./bin/api-spec-converter.js -from SWAGGER -to RAML10 ./path/to/swagger.json
```

Or install globally:

```
npm install -g
api-spec-converter --help
```

## Usage

### Convert RAML to OAS (Swagger), from a file.

```js
var transformer = require('api-spec-transformer');

var ramlToSwagger = new transformer.Converter(transformer.Formats.RAML, transformer.Formats.SWAGGER);

ramlToSwagger.loadFile('/source/raml.yaml', function(err) {
  if (err) {
    console.log(err.stack);
    return;
  }

  ramlToSwagger.convert('yaml')
    .then(function(convertedData) {
      // convertedData is swagger YAML string
    })
    .catch(function(err){
      console.log(err);
    });
});
```

### Convert OAS (Swagger) to RAML, from a URL.

```js
var transformer = require('api-spec-transformer');

// Convert swagger to raml, from a url.

var swaggerToRaml = new transformer.Converter(transformer.Formats.SWAGGER, transformer.Formats.RAML);

swaggerToRaml.loadFile('http://petstore.swagger.io/v2/swagger.json', function(err) {
  if (err) {
    console.log(err.stack);
    return;
  }

  swaggerToRaml.convert('yaml')
    .then(function(convertedData) {
      // convertedData is a raml YAML string
    })
    .catch(function(err){
      console.log(err);
    });
});
```

### Convert unknown input to RAML:

You can tell the converter to detect the input format automatically (by passing `AUTO` format), it will detect the right format for the input.

```js
var transformer = require('api-spec-transformer');

var myConverter = new transformer.Converter(transformer.Formats.AUTO, transformer.Formats.RAML);

swaggerToRaml.loadFile('http://petstore.swagger.io/v2/swagger.json', function(err) {
  // Will identify the input as swagger - the rest is the same as above.
});
```

### Load a string:

```js
var transformer = require('api-spec-transformer');

var swaggerToRaml = new transformer.Converter(transformer.Formats.SWAGGER, transformer.Formats.RAML);

var mySwaggerString = '...';

swaggerToRaml.loadData(mySwaggerString)
  .then(function() {
    // Do the converstion, as in the first two examples.
  });
```

## Supported Conversions

- OAS (Swagger 2) -> RAML 0.8
- OAS (Swagger 2) -> RAML 1.0
- RAML 1.0 -> OAS (Swagger 2)
- RAML 0.8 -> OAS (Swagger 2)
- Postman -> OAS (Swagger 2) * Experimental
- Postman -> RAML 0.8 * Experimental
- Postman -> RAML 1.0 * Experimental

## Development

Install dependencies:
```bash
npm install
```

Run tests:
```bash
npm test
```

Run eslint to check linting errors:
```bash
gulp lint
```

## Contributing

Contributions are welcome! Please check the current issues to make sure what you are trying to do has not already been discussed.

1. Fork.
2. Make changes.
3. Write tests.
4. Send a pull request.
