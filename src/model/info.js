//@flow
const InfoData = require('./infoData');
const Annotation = require('./annotation');

class Info {
	title: string;
	description: string;
	version: string|number;
	termsOfService: ?string;
	contact: InfoData;
	license: InfoData;
	annotations: Annotation[];
}

module.exports = Info;