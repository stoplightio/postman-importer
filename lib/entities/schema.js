class Schema {
	constructor(namespace) {
		this.name = '';
		this.namespace = namespace;
		this.definition = '';
		this.example = '';
		this.summary = '';
		this.description = '';
		this.public = true;
	}
	
	get Id() {
		return this._id;
	};
	
	set Id(id) {
		this._id = id;
	};
	
	get Name() {
		return this.name;
	};
	
	set Name(name) {
		this.name = name;
	};
	
	get NameSpace() {
		return this.namespace;
	};
	
	set Definition(definition) {
		this.definition = definition;
	};
	
	get Definition() {
		return this.definition;
	};
	
	get Example() {
		return this.example;
	};
	
	set SLData(schemaData) {
		let sd = schemaData || {};
		this.name = sd.name || '';
		this.definition = sd.definition || {};
		this.example = sd.example || {};
		this._id = sd._id;
	};
	
	get Summary() {
		return this.summary || '';
	};
	
	set Summary(summary) {
		this.summary = summary;
	};
	
	get Description() {
		return this.description;
	};
	
	set Description(desc) {
		this.description = desc;
	};
	
	get Public() {
		return this.public;
	};
	
	set Public(p) {
		this.public = p;
	};
}

module.exports = Schema;
