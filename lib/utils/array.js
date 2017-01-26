const _ = require('lodash');

module.exports = {
	allEqual: function allEqual(array) {
		return !!array.reduce(
			function(a, b){
				return (_.isEqual(a, b)) ? a : NaN;
			}
		);
	}
};
