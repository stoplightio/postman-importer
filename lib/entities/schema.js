class Schema {
	constructor(namespace) {
		this.name = '';
		this.namespace = namespace;
		this.definition = '';
	}
	
	get Name() {
		return this.name;
	}
	
	set Name(name) {
		this.name = name;
	}
	
	get NameSpace() {
		return this.namespace;
	}
	
	set Definition(definition) {
		this.definition = definition;
	}
	
	get Definition() {
		return this.definition;
	}
}

module.exports = Schema;
