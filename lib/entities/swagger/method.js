class Method {
	
	constructor(method, methodResolved) {
		this.method = method;
		this.methodResolved = methodResolved;
		
		this.summary = this.method.summary || this.methodResolved.summary;
		this.tags = this.method.tags || this.methodResolved.tags;
		this.description = this.method.description || this.methodResolved.description;
		this.deprecated = this.method.deprecated || this.methodResolved.deprecated;
		this.operationId = this.method.operationId || this.methodResolved.operationId;
		this.externalDocs = this.method.externalDocs || this.methodResolved.externalDocs;
		this.schemes = this.method.schemes || this.methodResolved.schemes;
		this.parameters = this.method.parameters || this.methodResolved.parameters;
		this.consumes = this.method.consumes || this.methodResolved.consumes;
		this.produces = this.method.produces || this.methodResolved.produces;
		this.responses = this.method.responses || this.methodResolved.responses;
		this.security = this.method.security || this.methodResolved.security;
	}
	
	get Summary() {
		return this.summary;
	}
	
	get Tags() {
		return this.tags;
	}
	
	get Description() {
		return this.description;
	}
	
	get Deprecated() {
		return this.deprecated;
	}
	
	// get OperationId() { return this.operationId; };
	get ExternalDocs() {
		return this.externalDocs;
	}
	
	// get Schemes() { return this.schemes; };
	get Parameters() {
		return this.parameters;
	}
	
	get Consumes() {
		return this.consumes;
	}
	
	get Produces() {
		return this.produces;
	}
	
	get Responses() {
		return this.responses;
	}
	
	get Security() {
		return this.security;
	}
}

module.exports = Method;
