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
		let path = (indexPath !== -1) ? url.substr(indexPath) : '';
		
		const result = {};
		if (!_.isEmpty(protocol) && protocol.startsWith('http') || protocol.startsWith('ws'))
			result.protocol = protocol;
		
		if (!_.isEmpty(host))
			result.host = host;
		
		if (!_.isEmpty(path)) {
			const queryIndex = path.indexOf('?');
			const pathWOQuery = queryIndex !== -1 ? path.substr(0, queryIndex) : path;
			const musicIndex = pathWOQuery.indexOf('#');
			const basePath = musicIndex !== -1 ? pathWOQuery.substr(0, musicIndex) : pathWOQuery;
			if (!_.isEmpty(basePath) && basePath !== '/')
				result.pathname = basePath;
		} 
		
		return result;
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
