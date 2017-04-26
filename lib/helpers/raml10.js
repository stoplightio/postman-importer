const _ = require('lodash');
const scalarTypes = ['string', 'number', 'integer', 'boolean', 'datetime', 'date-only', 'file', 'time-only', 'datetime-only', 'nil', 'null']

module.exports = {
	
	getAnnotationPrefix: '(',
	getScalarTypes : scalarTypes,
	getBuiltinTypes : _.concat(scalarTypes, ['any', 'array', 'object', 'union'])
	
};
