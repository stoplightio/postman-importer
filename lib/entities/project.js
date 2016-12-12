const Environment = require('./environment');

class Project {
	constructor(name) {
		this.name = name;
		this.description = '';
		
		this.environment = new Environment();
		
		this.endpoints = [];
		this.schemas = [];
		this.utilityFunctions = [];
		this.texts = [];
		this.traits = [];
		this.tests = [];
		this.savedEntries = [];
		this.pathParamsRef = {};
	}
	
	set Description(desc) {
		this.description = desc || '';
	};
	
	get Name() {
		return this.name;
	};
	
	get Description() {
		return this.description || '';
	};
	
	get Endpoints() {
		return this.endpoints;
	};
	
	set Endpoints(endpoints) {
		this.endpoints = endpoints;
	};
	
	get Schemas() {
		return this.schemas;
	};
	
	set Schemas(schemas) {
		this.schemas = schemas;
	};
	
	get Environment() {
		return this.environment;
	};
	
	set Environment(env) {
		this.environment = env;
	};
	
	get UtilityFunctions() {
		return this.utilityFunctions;
	};
	
	get Texts() {
		return this.texts;
	};
	
	get Traits() {
		return this.traits;
	};
	
	get Tests() {
		return this.tests;
	};
	
	set Tests(tests) {
		this.tests = tests;
	};
	
	get SavedEntries() {
		return this.savedEntries;
	};
	
	set SavedEntries(savedEntries) {
		this.savedEntries = savedEntries;
	};
	
	addEndpoint(endpoint) {
		this.endpoints.push(endpoint);
	};
	
	addSchema(schema) {
		this.schemas.push(schema);
	};
	
	addUtilityFunction(uf) {
		this.utilityFunctions.push(uf);
	};
	
	addText(txt) {
		this.texts.push(txt);
	};
	
	addTrait(trait) {
		this.traits.push(trait);
	};
	
	addTest(test) {
		this.tests.push(test);
	};
	
	addSavedEntry(savedEntry) {
		this.savedEntries.push(savedEntry);
	};
	
	loadSLData(slData) {
		this.Description = slData.description;
	};
	
	addPathParamRef(path, paramName) {
		this.pathParamsRef[path] = paramName;
	};
	
	getPathParamRef(path) {
		return this.pathParamsRef[path];
	};
}

module.exports = Project;
