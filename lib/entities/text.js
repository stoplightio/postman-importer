class Text {
	constructor(name) {
		this._id = null;
		this.name = name;
		this.content = '';
		this.public = '';
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
	
	set Content(content) {
		this.content = content;
	}
	
	get Content() {
		return this.content;
	}
	
	get Public() {
		return this.public;
	}
	
	set Public(p) {
		this.public = p;
	}
	
	toJSON() {
		return {
			id: this.Id,
			name: this.Name,
			content: this.Content,
			public: this.Public
		};
	}
	
}

module.exports = Text;
