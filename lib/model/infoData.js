//@flow
const Annotation = require('./annotation');

class InfoData {
	name: ?string;
	url: ?string;
	email: ?string;
	annotations: Annotation[];
}

module.exports = InfoData;