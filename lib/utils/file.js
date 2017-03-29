const _ = require('lodash');

module.exports = {
	isFilePath: function isFilePath(path) {
		const re = /[‘“!#$%&+^<=>`]/;
		const result = ((typeof str !== 'string') || (typeof str === 'string' && (/[*!?{}(|)[\]]/.test(str) || (typeof str === 'string'	&& /[@?!+*]\(/.test(str)))) || re.test(str)) === false;
		return result;
	},

	pathStartsWith: function pathStartsWith(path, str) {
		return _.split(path, '-', 2 )[0] === str;
	}
};