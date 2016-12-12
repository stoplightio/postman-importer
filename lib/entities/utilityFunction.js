class UtilityFunction {
	constructor(name) {
		this.name = name;
		this.description = '';
		this.script = '';
	}
	
	get Name() {
		return this.name;
	};
	
	set Description(description) {
		this.description = description;
	};
	
	get Description() {
		return this.description;
	};
	
	set Script(script) {
		this.script = script;
	};
	
	get Script() {
		return this.script;
	};
	
	toJSON() {
		return {
			name: this.Name,
			description: this.Description,
			script: this.Script
		};
	}
}

module.exports = UtilityFunction;
