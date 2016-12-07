# OAS RAML Converter [![Build Status](https://travis-ci.org/mulesoft/api-spec-converter.svg)](https://travis-ci.org/mulesoft/api-spec-converter) [![Coverage Status](https://coveralls.io/repos/stoplightio/api-spec-converter/badge.svg?branch=master&service=github)](https://coveralls.io/github/mulesoft/api-spec-converter?branch=master)

This package helps to convert between different API specifications. It was originally forked from [the stoplight.io converter](https://github.com/stoplightio/api-spec-converter). 

## Supported Conversions

- OAS (Swagger 2.0) -> RAML 0.8
- OAS (Swagger 2.0) -> RAML 1.0
- RAML 0.8 -> OAS (Swagger 2.0)
- RAML 1.0 -> OAS (Swagger 2.0)
- RAML 0.8 -> RAML 1.0

## Using

### 1. Online web page

For an online conversion, see: [https://mulesoft.github.io/api-spec-converter](https://mulesoft.github.io/api-spec-converter).

### 2. Command line tool

```
chmod +x ./bin/converter.js
./bin/converter.js --from SWAGGER --to RAML10 ./path/to/swagger.json
```

Or install globally:

```
npm install -g
oas-raml-converter --from SWAGGER --to RAML10 ./path/to/swagger.json
```

### 3. As a service

To run in an express server:
```
npm start
```

Then, make a post request with the file content to `/convert?from=SWAGGER&to=RAML10`:
```
wget --quiet \
  --method POST \
  --body-data <the swagger document> \
  --output-document \
  - http://localhost:3000/convert?from=SWAGGER&to=RAML10
```

You can also deploy it in a serverless fashion as a AWS lambdas function. Use `index-serverless.js` to configure your AWS lamda function.

### 4. As a dependency

#### Installation (NodeJS or Browser)

```bash
npm install --save oas-raml-converter
```

#### Initializing a converter

Raml 1.0 to OAS 2.0:
```js
var converter = require('oas-raml-converter');
var ramlToSwagger = new converter.Converter(converter.Formats.RAML10, converter.Formats.OAS);
```

OAS 2.0 to Raml 1.0:
```js
var converter = require('oas-raml-converter');
var swaggerToRaml = new converter.Converter(converter.Formats.OAS, converter.Formats.RAML10);
```

You can tell the converter to detect the input format automatically by passing `AUTO` format:
```js
var converter = require('oas-raml-converter');
var autoToRaml = new converter.Converter(converter.Formats.AUTO, converter.Formats.RAML10);
```

#### Converting from a file

```js
swaggerToRaml.convertFile('/path/to/swagger.json').then(function(raml) {
  console.log(raml); // raml is raml yaml string
})
.catch(function(err) {
  console.error(err);
});
```

#### Converting from a url

```js
swaggerToRaml.convertUrl('http://petstore.swagger.io/v2/swagger.json').then(function(raml) {
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
    validateInput: false, // Parse the input to check that its a valid document before converting
    validateOutput: false, // Parse the output to check that its a valid document after converting
    fs: { ... } // Use a custom file solver
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
