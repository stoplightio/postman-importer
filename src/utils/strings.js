const _ = require('lodash');

module.exports = {
	computeOperationId: function (method, path) {
		method = _.trim(method).toUpperCase();
		path = _.trim(path);
		
		if (path === '/' || path === '') {
			return method + '_root';
		}
		
		return method + '_' + _.trim(path, '/').replace(/[{}]/g, '').replace(/[\/.]/g, '-');
	},
	
	computeTraitName: function (name, key) {
		let traitName = 'trait:' + _.camelCase(name);
		
		if (key) {
			traitName += ':' + key;
		}
		
		return traitName;
	},

	computeTraitNameOas30: function (name, key) {
		let traitName = 'trait_' + _.camelCase(name);

		if (key) {
			traitName += '_' + key;
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
	},

	sanitise: function (s: string): string {
		const components = s.split('/');
		components[0] = components[0].replace(/[^A-Za-z0-9_\-.]+|\s+/gm, '_');
		return components.join('/');
	},

	getIndent: function (line: string) : number {
		const trimStart = _.trimStart(line);
		return line.length - trimStart.length;
	}
};
