const importers = {
	Postman: require('./postman'),
	RAML08: require('./raml08'),
	RAML10: require('./raml10'),
	Swagger: require('./swagger'),
	StopLight: require('./stoplight'),
	StopLightX: require('./stoplightx'),
	Auto: require('./auto')
};

function doesSupportFormat(format) {
	return !(!format || !format.name || !importers.hasOwnProperty(format.className));
}

module.exports = {
	hasSupport: doesSupportFormat,
	factory: (format) => {
		if (!doesSupportFormat(format)) {
			return null;
		}
		return new importers[format.className]();
	}
};
