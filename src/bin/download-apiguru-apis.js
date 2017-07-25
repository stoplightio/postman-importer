const fs = require('fs');
const slugify = require('slugify');
const util = require('./util');
const urlHelper = require('../../src/utils/url');

const baseDir = __dirname + '../../../test/data/apis-guru/swagger';
const baseUrl = 'https://api.apis.guru/v2/specs/';

urlHelper.get('https://api.apis.guru/v2/list.json').then((body) => {
	const apis = JSON.parse(body);
	const urls = [];
	Object.keys(apis).forEach(key => {
		const versions = apis[key].versions;
		Object.keys(versions).forEach(key => {
			const version = versions[key];
			urls.push(version.swaggerUrl);
		});
	});
	
	console.log(`Dowloading ${urls.length} swaggers`);
	
	urls.forEach((url) => {
		urlHelper.get(url).then((swagger) => {
			const fileName = slugify(url.replace(baseUrl, ''));
			fs.writeFile(`${baseDir}/${fileName}`, swagger, (error) => {
				if (error) util.exit(error);
			});
		}).catch(util.exit);
	});
	
}).catch(util.exit);
