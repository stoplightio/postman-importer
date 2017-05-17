const path = require('path');
const _ = require('lodash');

module.exports = {
	isFilePath: function isFilePath(object) {
		if (_.isEmpty(object)) return false;

		const split = object.split(path.sep);
		if (split.length === 0) return false;

		let result = false;
		split.forEach(entry => {
			if (entry.split('.').length === 2)
				result = true;
		});
		return result;
	}
};