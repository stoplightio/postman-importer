const importers = {
	RAML: require('../raml/ramlConverter'),
	OAS20: require('../oas20/oas20Converter'),
	OAS30: require('../oas30/oas30Converter')
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
