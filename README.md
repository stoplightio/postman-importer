# OAS RAML Converter [![npm version](https://badge.fury.io/js/oas-raml-converter.svg)](https://www.npmjs.com/package/oas-raml-converter)

### Master [![Build Status](https://travis-ci.org/mulesoft/oas-raml-converter.svg?branch=master)](https://travis-ci.org/mulesoft/oas-raml-converter) [![Coverage Status](https://coveralls.io/repos/github/mulesoft/oas-raml-converter/badge.svg?branch=master)](https://coveralls.io/github/mulesoft/oas-raml-converter?branch=master) 

### v0.2.x [![Build Status](https://travis-ci.org/mulesoft/oas-raml-converter.svg?branch=v0.2.x)](https://travis-ci.org/mulesoft/oas-raml-converter) [![Coverage Status](https://coveralls.io/repos/github/mulesoft/oas-raml-converter/badge.svg?branch=v0.2.x)](https://coveralls.io/github/mulesoft/oas-raml-converter?branch=v0.2.x) 

This package helps to convert between different API specifications. It was originally forked from [the stoplight.io converter](https://github.com/stoplightio/api-spec-converter). 

## Supported Conversions (beta)

- OAS (OAS 2.0) -> RAML 1.0: [Complete Functional Specification](./docs/OAS20-to-RAML10.md)
- RAML 1.0 -> OAS (OAS 2.0): [Complete Functional Specification](./docs/RAML10-to-OAS20.md)
- RAML 0.8 -> OAS (OAS 2.0)
- RAML 0.8 -> RAML 1.0

## Using

### 1. Online web page

For an online conversion, use: [https://mulesoft.github.io/oas-raml-converter](https://mulesoft.github.io/oas-raml-converter).

### 2. Command line tool

This utility helps you converting local files from your command line.

```
npm run build

./lib/bin/converter.js --from OAS --to RAML10 ./path/to/swagger.json
./lib/bin/converter.js --from OAS --to RAML10 ./path/to/swagger.json > output.raml
```

Or install globally and then:

```
oas-raml-converter --from OAS --to RAML10 ./path/to/swagger.json
oas-raml-converter --from OAS --to RAML10 ./path/to/swagger.json > output.raml
```

### 3. As a service

For a REST API of the converter, you can start it in an express server, checkout the [oas-raml-converter-service](https://github.com/mulesoft/oas-raml-converter-service) project.

### 4. As a dependency

#### Installation (NodeJS or Browser)

```bash
npm install --save oas-raml-converter
```

#### Initializing a converter

Raml 1.0 to OAS 2.0:
```js
var converter = require('oas-raml-converter');
var raml10ToOas20 = new converter.Converter(converter.Formats.RAML, converter.Formats.OAS20);
```

OAS 2.0 to Raml 1.0:
```js
var converter = require('oas-raml-converter');
var oas20ToRaml10 = new converter.Converter(converter.Formats.OAS20, converter.Formats.RAML);
```

The converter detects the input raml format automatically by passing `RAML` import format, so:
Raml 0.8 to OAS 2.0:
```js
var converter = require('oas-raml-converter');
var raml08ToOas20 = new converter.Converter(converter.Formats.RAML, converter.Formats.OAS20);
```
Raml 0.8 to Raml 1.0:
```js
var converter = require('oas-raml-converter');
var raml08ToRaml10 = new converter.Converter(converter.Formats.RAML, converter.Formats.RAML);
```

#### Converting from a file or url

```js
oas20ToRaml10.convertFile('/path/to/swagger.json').then(function(raml) {
  console.log(raml); // raml is raml yaml string
})
.catch(function(err) {
  console.error(err);
});
```

#### Converting from a string or json

```js
var myOasString = '...';
oas20ToRaml10.convertData(myOasString).then(function(raml) {
  console.log(raml); // raml is raml yaml string
})
.catch(function(err) {
  console.error(err);
});
```

#### Passing options

```js
var options = {
    validate: false, // Parse both input and output to check that its a valid document
    validateImport: false, // Only validate input
    validateExport: false, // Only validate output
    format: 'yaml', // Output format: json (default for OAS) or yaml (default for RAML)
    fs: { ... } // Use a custom file system solver (not yet available)
};

oas20ToRaml10.convertFile('/path/to/swagger.json', options).then(function(raml) {
  console.log(raml); // raml is raml yaml string
})
.catch(function(err) {
  console.error(err);
});
```

## Contributing

Contributions are welcome! Please check the current issues to make sure what you are trying to do has not already been discussed.

### Steps

1. Fork.
2. Make changes.
3. Write tests.
4. Send a pull request.

### Develop

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
npm run eslint
```
