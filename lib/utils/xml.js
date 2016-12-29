const parseString = require('xml2js').parseString;

module.exports = {
	isXml: function (data) {
		let result = false;
		parseString(data, (err, r) => {
			if (r) result = true;
		});
		return result;
	}
};
