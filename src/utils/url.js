const request = require('request');
const _ = require('lodash');

module.exports = {
	parseURL: url => {
		const indexProtocol = url.indexOf('://');
		const protocol = (indexProtocol !== -1) ? url.substr(0, indexProtocol) : '';
		const protocolLength = (indexProtocol !== -1) ? protocol.length + 3 : 0;
		const indexPath = url.indexOf('/', protocolLength);
		const hostnameLength = (indexPath !== -1) ? indexPath - protocolLength : url.length - protocolLength;
		const host = url.substr(protocolLength, hostnameLength);
		const path = (indexPath !== -1) ? url.substr(indexPath) : '';
		
		return {
			protocol: protocol.startsWith('http') || protocol.startsWith('ws') ? protocol : 'http',
			host: host,
			pathname: path
		};
	}, 
	isURL: path =>{
		if (!path) {
			throw new Error('Invalid path/url string given.');
		}
		const expression = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%_+.~#?&\/=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_+.~#?&\/=]*)?/gi;
		const regexp = new RegExp(expression);
		return path.match(regexp);
	},
	
	get: (url) => {
		return new Promise((resolve, reject) => {
			request(url, (error, response, body) =>{
				if (!error && response.statusCode === 200) {
					resolve(body);
				} else {
					reject(error || new Error('Could not fetch remote URL.'));
				}
			});
		});
	},
	
	join: (a, b) => {
		return _.trimEnd(a, '/') + '/' + _.trimStart(b, '/');
	},
	
	isTemplateUri: (uri) => {
		const decodeUri = decodeURI(uri);
		return decodeUri.indexOf('{') !== -1 && decodeUri.indexOf('}') !== -1;
	}
};
