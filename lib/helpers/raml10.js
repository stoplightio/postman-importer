const _ = require('lodash');

module.exports = {
	
	removePropertyFromObject: function (object, propName) {
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;
		
			const value = object[id];
			if (id === propName) {
				delete object[id];
			}
			if (typeof value === 'object') {
				this.removePropertyFromObject(value, propName);
			}
		}
	}
	
};
