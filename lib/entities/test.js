class Test {
	constructor(name) {
		this._id = null;
		this.name = name;
		this.summary = '';
		// TODO map each step to maintain proper structure
	}
	
	get Id() {
		return this._id;
	}
	
	set Id(id) {
		this._id = id;
	}
	
	get Name() {
		return this.name;
	}
	
	set Name(name) {
		this.name = name;
	}
	
	get Summary() {
		return this.summary || '';
	}
	
	set Summary(summary) {
		this.summary = summary;
	}
}

module.exports = Test;
