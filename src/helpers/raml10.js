const _ = require('lodash');
const scalarTypes = ['string', 'number', 'integer', 'boolean', 'datetime', 'date-only', 'file', 'time-only', 'datetime-only', 'nil', 'null'];

module.exports = {
	
	getAnnotationPrefix: '(',
	getScalarTypes : scalarTypes,
	getBuiltinTypes : _.concat(scalarTypes, ['any', 'array', 'object', 'union']),

	unescapeYamlIncludes: function (yaml) {
		const start = yaml.indexOf("'!include ");
		if (start === -1) return yaml;
		const end = yaml.indexOf("'", start + 1);
		if (end === -1) return yaml;
		return yaml.substring(0, start) + yaml.substring(start + 1, end) + this.unescapeYamlIncludes(yaml.substring(end + 1));
	}
};
