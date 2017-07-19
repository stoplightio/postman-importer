exports.exit = (error) => {
	console.error(error);
	process.exit(1);
};

exports.stringify = (data) => {
	if (typeof data === 'string') return data;
	const result = JSON.stringify(data, null, 2);
	return result === '{}' ? '' : result;
};