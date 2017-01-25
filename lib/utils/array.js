const _ = require('lodash');

module.exports = {
	groupBy: function groupBy(array, f) {
		let groups = {};
		
		array.forEach(function (o) {
			let group = JSON.stringify(f(o));
			
			groups[group] = groups[group] || [];
			groups[group].push(o);
		});
		
		return Object.keys(groups).map(function (group) {
			return groups[group];
		});
	},
	
	allEqual: function allEqual(array) {
		return !!array.reduce(
			function(a, b){
				return (_.isEqual(a, b)) ? a : NaN;
			}
		);
	}
};
