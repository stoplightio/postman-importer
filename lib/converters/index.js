const importers = {
	RAML08: require('../raml10/raml10Converter'),
	RAML10: require('../raml10/raml10Converter'),
	OAS20: require('../oas20/oas20Converter')
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
