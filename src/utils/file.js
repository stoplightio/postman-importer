// @flow

const _ = require('lodash');

module.exports = {
	isFilePath: function isFilePath(path: string) {
		if (_.isEmpty(path)) return false;

		const split = path.split('/');
		if (split.length === 0) return false;

		let result = false;
		split.forEach(entry => {
			if (entry.split('.').length === 2)
				result = true;
		});
		return result;
	}
};
