# OAS RAML Converter [![Build Status](https://travis-ci.org/mulesoft/oas-raml-converter.svg)](https://travis-ci.org/mulesoft/oas-raml-converter) [![Coverage Status](https://coveralls.io/repos/github/mulesoft/oas-raml-converter/badge.svg?branch=master)](https://coveralls.io/github/mulesoft/oas-raml-converter?branch=master)

This package helps to convert between different API specifications. It was originally forked from [the stoplight.io converter](https://github.com/stoplightio/api-spec-converter). 

## Supported Conversions

- OAS (Swagger 2.0) -> RAML 1.0
- RAML 0.8 -> OAS (Swagger 2.0)
- RAML 1.0 -> OAS (Swagger 2.0)
- RAML 0.8 -> RAML 1.0

## Using

### 1. Online web page

For an online conversion, use: [https://mulesoft.github.io/api-spec-converter](https://mulesoft.github.io/oas-raml-converter).

### 2. Command line tool

```
./lib/bin/converter.js --from SWAGGER --to RAML10 ./path/to/swagger.json
```

Or install globally and then:

```
oas-raml-converter --from SWAGGER --to RAML10 ./path/to/swagger.json
```

### 3. As a service (not yet available)

Start the converter in an express server:
```
npm start
```

Then, make a post with the file content to `/convert/SWAGGER/to/RAML10`:
```
wget --quiet \
  --method POST \
  --body-data <the swagger document> \
  --output-document \
  - http://localhost:3000/convert/SWAGGER/to/RAML10
```

### 4. As a dependency

#### Installation (NodeJS or Browser)

```bash
npm install --save oas-raml-converter
```

#### Initializing a converter

Raml 1.0 to OAS 2.0:
```js
var converter = require('oas-raml-converter');
var ramlToSwagger = new converter.Converter(converter.Formats.RAML10, converter.Formats.SWAGGER);
```

OAS 2.0 to Raml 1.0:
```js
var converter = require('oas-raml-converter');
var swaggerToRaml = new converter.Converter(converter.Formats.SWAGGER, converter.Formats.RAML10);
```

You can tell the converter to detect the input format automatically by passing `AUTO` format:
```js
var converter = require('oas-raml-converter');
var autoToRaml = new converter.Converter(converter.Formats.AUTO, converter.Formats.RAML10);
```

#### Converting from a file or url

```js
swaggerToRaml.convertFile('/path/to/swagger.json').then(function(raml) {
  console.log(raml); // raml is raml yaml string
})
.catch(function(err) {
  console.error(err);
});
```

#### Converting from a string or json

```js
var mySwaggerString = '...';
swaggerToRaml.convertData(mySwaggerString).then(function(raml) {
  console.log(raml); // raml is raml yaml string
})
.catch(function(err) {
  console.error(err);
});
```

#### Passing options

```js
var options = {
    validate: false, // Parse the output to check that its a valid document
    format: 'yaml', // Output format: json (default for OAS) or yaml (default for RAML)
    fs: { ... } // Use a custom file system solver (not yet available)
};

swaggerToRaml.convertFile('/path/to/swagger.json', options).then(function(raml) {
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
npm run lint
```
