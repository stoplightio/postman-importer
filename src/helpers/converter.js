const _ = require('lodash');

module.exports = {
	
	getValidMethods: ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'],
	
	getValidMimeTypes: ['application/json', 'application/xml', 'text/xml'],
	
	getValidFormDataMimeTypes : ['multipart/form-data', 'application/x-www-form-urlencoded'],
	
	removePropertiesFromObject: function (object, propNames) {
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;
		
			const value = object[id];
			if (_.includes(propNames,id)) {
				delete object[id];
			}
			if (typeof value === 'object') {
				this.removePropertiesFromObject(value, propNames);
			}
		}
	},
	
	getResponseName(method, code) {
		return method + ':' + code;
	},

	isJson: function (str) {
		try {
			JSON.parse(str);
		} catch (e) {
			return false;
		}
		return true;
	}
};
