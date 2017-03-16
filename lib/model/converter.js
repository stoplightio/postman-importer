const _ = require('lodash');

class Converter {

	export(models) {
		const result = {};
		Object.entries(models).map(([key, value]) => {
			result[key] = this._export(value);
		});

		return result;
	}

	static copyObjectFrom(object, attrIdMap, attrIdSkip) {
		const result = {};

		Object.entries(object).map(([key, value]) => {
			if (attrIdSkip.indexOf(key) < 0) {
				result[attrIdMap.hasOwnProperty(key) ? attrIdMap[key] : key] = value;
			}
		});

		return result;
	}

	import(specDefs) {
		const result = {};
		if (_.isEmpty(specDefs)) return result;

		Object.entries(specDefs).map(([key, value]) => {
			result[key] = this._import(value);
		});

		return result;
	}

	_export() {
		throw new Error('export method not implemented');
	}

	_import() {
		throw new Error('import method not implemented');
	}
}

module.exports = Converter;