var supportedFormats = {
  'POSTMAN': {
    name: 'Postman',
    className: 'Postman',
    formats: ['Json'],
    deprecated: true
  },
  'RAML08':  {
    name: 'RAML 0.8',
    className: 'RAML08',
    formats: ['Yaml'],
    deprecated: false
  },
  'RAML10':  {
    name: 'RAML 1.0',
    className: 'RAML10',
    formats: ['Yaml'],
    deprecated: false
  },
  'SWAGGER': {
    name: 'Swagger 2.0',
    className: 'Swagger',
    formats: ['Json', 'Yaml'],
    deprecated: false
  },
  'STOPLIGHT': {
    name: 'StopLight',
    className: 'StopLight',
    formats: ['Json'],
    deprecated: true
  },
  'STOPLIGHTX': {
    name: 'StopLightX',
    className: 'StopLightX',
    formats: ['Json'],
    deprecated: true
  },
  'AUTO': {
    name: 'Auto',
    className: 'Auto',
    formats: ['Json'],
    deprecated: false
  }
};

module.exports = supportedFormats;
