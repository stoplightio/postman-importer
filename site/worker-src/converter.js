const Converter = require('../../src/index').Converter;

const stringify = (data) => {
	if (!data) return '';
	if (typeof data === 'string') return data;
	const result = JSON.stringify(data, null, 2);
	return result === '{}' ? '' : result;
};

const resolve = (error, result) => {
	self.postMessage({
		result: stringify(result),
		error: stringify(error),
		message: error ? error.message : ''
	});
};

self.addEventListener('message', (e) => {
	const message = e.data;
	const converter = new Converter(message.fromLanguage, message.toLanguage);

	converter.convertData(message.rawData, {validate: true}).then((success) =>
			resolve(null, success)
	).catch((error) => {
		// if an error is found, try to retrieve the invalid output
		converter.convertData(message.rawData, {validate: false}).then((success) =>
				resolve(error, success)
		).catch(resolve);
	});

}, false);