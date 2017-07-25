module.exports = {
	
	getAnnotationPrefix: 'x-annotation-',
	getAcceptedSchemes: ['http', 'https', 'ws', 'wss'],

	isFilePath: function isFilePath(param) {
		if (!param || !param.$ref) {
			return false;
		}

		const filePath = param.$ref.split('#')[0];
		return filePath.split('.').length > 1;
	}
};
