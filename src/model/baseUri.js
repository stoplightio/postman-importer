//@flow
const Annotation = require('./annotation');

class BaseUri {
	host: string;
	basePath: string;
	protocol: string;
	uri: string;
	annotations: Annotation[];
}

module.exports = BaseUri;