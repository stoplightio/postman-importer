const request = require('request');
const _ = require('lodash');

module.exports = {
	isURL: path =>{
		if (!path) {
			throw new Error('Invalid path/url string given.');
		}
		const expression = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%_\+.~#?&\/\/=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)?/gi;
		const regexp = new RegExp(expression);
		return path.match(regexp);
	},
	
	get: (url) => {
		return new Promise((resolve, reject) => {
			request(url, (error, response, body) =>{
				if (!error && response.statusCode == 200) {
					resolve(body);
				} else {
					reject(error || new Error('Could not fetch remote URL.'));
				}
			});
		});
	},
	
	join: (a, b) => {
		return _.trimEnd(a, '/') + '/' + _.trimStart(b, '/');
	}
};
