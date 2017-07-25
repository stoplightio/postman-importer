class SwaggerDefinition {
	
	constructor(title, description) {
		this.swagger = '2.0';
		this.info = {
			'version': '',
			'title': title
		};
		if (description) {
			this.info['description'] = description;
		}
		this.host = '';
		this.basePath = '';
		this.schemes = [];
		this.consumes = [];
		this.produces = [];
		this.securityDefinitions = {};
		this.paths = {};
		this.parameters = {};
		this.responses = [];
	}
	
	set BasePath(basePath) {
		if (basePath && basePath.length > 0) {
			this.basePath = basePath;
		} else {
			delete this.basePath;
		}
	}
	
	set Host(host) {
		if (host && host.length > 0) {
			this.host = host;
		} else {
			delete this.host;
		}
	}
}

module.exports = SwaggerDefinition;
