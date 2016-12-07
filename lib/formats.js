var supportedFormats = {
  'POSTMAN': {
    name: 'Postman',
    className: 'Postman',
    formats: ['json'],
    deprecated: true
  },
  'RAML08':  {
    name: 'RAML 0.8',
    className: 'RAML08',
    formats: ['yaml'],
    deprecated: false
  },
  'RAML10':  {
    name: 'RAML 1.0',
    className: 'RAML10',
    formats: ['yaml'],
    deprecated: false
  },
  'SWAGGER': {
    name: 'Swagger 2.0',
    className: 'Swagger',
    formats: ['json', 'yaml'],
    deprecated: false
  },
  'STOPLIGHT': {
    name: 'StopLight',
    className: 'StopLight',
    formats: ['json'],
    deprecated: true
  },
  'STOPLIGHTX': {
    name: 'StopLightX',
    className: 'StopLightX',
    formats: ['json'],
    deprecated: true
  },
  'AUTO': {
    name: 'Auto',
    className: 'Auto',
    formats: ['json'],
    deprecated: false
  }
};

module.exports = supportedFormats;
