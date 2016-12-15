const _ = require('lodash');

module.exports = {
	computeOperationId: function (method, path) {
		method = _.trim(method).toUpperCase();
		path = _.trim(path);
		
		if (path === '/' || path === '') {
			return method + '_root';
		}
		
		return method + '_' + _.trim(path, '/').replace(/\{|\}/g, '').replace(/\/|\./g, '-');
	},
	computeTraitName: function (name, key) {
		let traitName = 'trait:' + _.camelCase(name);
		
		if (key) {
			traitName += ':' + key;
		}
		
		return traitName;
	},
	checkAndReplaceInvalidChars: function(object, invalidChars, replacement) {
		for (let index in invalidChars) {
			if (!invalidChars.hasOwnProperty(index)) continue;
			object = _.replace(object, invalidChars[index], replacement);
		}
		return object;
	}
};
