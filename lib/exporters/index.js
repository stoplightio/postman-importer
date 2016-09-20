var exporters = {
  Swagger: require('./swagger'),
  StopLightX: require('./stoplightx'),
  RAML08: require('./raml08'),
  RAML10: require('./raml10')
};

function hasFormatSupport(format) {
  if(!format || !format.name || !exporters.hasOwnProperty(format.className)) {
    return false;
  }
  return true;
}


module.exports = {
  hasSupport: hasFormatSupport,
  factory: function(format) {
    if (!hasFormatSupport(format)) {
      return null;
    }
    return new exporters[format.className]();
  }
};
