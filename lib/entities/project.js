const Environment = require('./environment');

class Project {
	constructor(name) {
		this.name = name;
		this.description = '';
		
		this.environment = new Environment();
		
		this.endpoints = [];
		this.resources = [];
		this.schemas = [];
		this.texts = [];
		this.traits = [];
		this.pathParamsRef = {};
	}
	
	set Description(desc) {
		this.description = desc || '';
	}
	
	get Name() {
		return this.name;
	}
	
	get Description() {
		return this.description || '';
	}
	
	get Endpoints() {
		return this.endpoints;
	}
	
	set Endpoints(endpoints) {
		this.endpoints = endpoints;
	}
	
	get Resources() {
		return this.resources;
	}
	
	set Resources(resources) {
		this.resources = resources;
	}
	
	addResource(resource) {
		this.resources.push(resource);
	}
	
	get Schemas() {
		return this.schemas;
	}
	
	set Schemas(schemas) {
		this.schemas = schemas;
	}
	
	get Environment() {
		return this.environment;
	}
	
	set Environment(env) {
		this.environment = env;
	}
	
	get Texts() {
		return this.texts;
	}
	
	get Traits() {
		return this.traits;
	}
	
	addEndpoint(endpoint) {
		this.endpoints.push(endpoint);
	}
	
	addSchema(schema) {
		this.schemas.push(schema);
	}
	
	addText(txt) {
		this.texts.push(txt);
	}
	
	addTrait(trait) {
		this.traits.push(trait);
	}
	
	addPathParamRef(path, paramName) {
		this.pathParamsRef[path] = paramName;
	}
	
	getPathParamRef(path) {
		return this.pathParamsRef[path];
	}
}

module.exports = Project;
