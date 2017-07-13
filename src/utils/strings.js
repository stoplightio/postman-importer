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
	
	computeResourceDisplayName: function (path) {
		return path.substring(path.lastIndexOf('/') + 1);
	},
	
	checkAndReplaceInvalidChars: function(object, validChars, replacement) {
		for (const index in object) {
			if (!object.hasOwnProperty(index)) continue;
			if (!validChars.includes(object[index])) object = _.replace(object, object[index], replacement);
		}
		return object;
	}
};
