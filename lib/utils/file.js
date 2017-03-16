module.exports = {
	isFilePath: function isFilePath(path) {
		const re = /[‘“!#$%&+^<=>`]/;
		const result = ((typeof str !== 'string') || (typeof str === 'string' && (/[*!?{}(|)[\]]/.test(str) || (typeof str === 'string'	&& /[@?!+*]\(/.test(str)))) || re.test(str)) === false;
		return result;
	}
};