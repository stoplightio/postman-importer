const request = require('request');
const _ = require('lodash');

module.exports = {
	isURL: function (path) {
		if (!path) {
			throw new Error('Invalid path/url string given.');
		}
		let expression = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%_\+.~#?&\/\/=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)?/gi;
		let regexp = new RegExp(expression);
		return path.match(regexp);
	},
	
	get: function (url) {
		return new Promise(function (resolve, reject) {
			request(url, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					resolve(body);
				} else {
					reject(error || new Error('Could not fetch remote URL.'));
				}
			});
		});
	},
	
	join: function (a, b) {
		return _.trimEnd(a, '/') + '/' + _.trimStart(b, '/');
	}
};
