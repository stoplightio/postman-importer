class Environment {
	
	constructor() {
		this.summary = '';
		this.forwardHost = null;
		this.basePath = '';
		this.protocols = [];
		this.version = '';
		this.produces = null;
		this.consumes = null;
		this.middlewareBefore = '';
		this.middlewareAfter = '';
		this.proxy = {};
		this.securitySchemes = {};
		this.resourcesOrder = {
			utilFuncs: [],
			docs: [],
			savedEntries: []
		};
	}
	
	set Host(host) {
		this.forwardHost = host;
	}
	
	get Host() {
		return this.forwardHost;
	}
	
	set BasePath(basePath) {
		this.basePath = basePath;
	}
	
	get BasePath() {
		return this.basePath || '';
	}
	
	set Consumes(consumes) {
		this.consumes = consumes;
	}
	
	get Consumes() {
		return this.consumes;
	}
	
	set Produces(produces) {
		this.produces = produces;
	}
	
	get Produces() {
		return this.produces;
	}
	
	get Protocols() {
		return this.protocols;
	}
	
	set Protocols(protocols) {
		this.protocols = protocols;
	}
	
	get Version() {
		return this.version || '';
	}
	
	set Version(version) {
		this.version = version;
	}
	
	// set Proxy(proxy) {
	// 	this.proxy = proxy;
	// };
	// get Proxy() {
	// 	if(this.proxy) {
	// 		delete this.proxy['sslCert'];
	// 		delete this.proxy['sslKey'];
	// 	}
	// 	return this.proxy;
	// };
	// set MiddlewareBefore(before) {
	// 	this.middlewareBefore = before;
	// };
	// get MiddlewareBefore() {
	// 	return this.middlewareBefore;
	// };
	// set MiddlewareAfter(after) {
	// 	this.middlewareAfter = after;
	// };
	// get MiddlewareAfter() {
	// 	return this.middlewareAfter;
	// };
	set GroupsOrder(eo) {
		this.resourcesOrder = eo;
	}
	
	get GroupsOrder() {
		return this.resourcesOrder;
	}
	
	set SecuritySchemes(schemes) {
		this.securitySchemes = schemes;
	}
	
	get SecuritySchemes() {
		return this.securitySchemes;
	}
	
	// addSecurityScheme (key, securityScheme) {
	// 	this.securitySchemes[key] = securityScheme;
	// };
	
}

module.exports = Environment;
