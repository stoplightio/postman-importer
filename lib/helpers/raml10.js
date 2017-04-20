const _ = require('lodash');

module.exports = {
	
	getAnnotationPrefix: '(',

	getScalarTypes : ['string', 'number', 'integer', 'boolean', 'datetime', 'date-only', 'file', 'time-only', 'datetime-only', 'nil', 'null'],
	getBuiltinTypes : _.concat(this.getScalarTypes, ['any', 'array', 'object', 'union'])
	
};
