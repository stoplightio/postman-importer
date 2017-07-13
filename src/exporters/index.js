const exporters = {
	Swagger: require('./swagger'),
	RAML08: require('./raml08'),
	RAML10: require('./raml10')
};

function hasFormatSupport(format) {
	return !(!format || !format.name || !exporters.hasOwnProperty(format.className));
}


module.exports = {
	hasSupport: hasFormatSupport,
	factory: function (format) {
		if (!hasFormatSupport(format)) {
			return null;
		}
		return new exporters[format.className]();
	}
};
