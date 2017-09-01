// @flow

class Line {

	lineNumber: number;
	indent: number;
	data: string;
	
	constructor(lineNumber: number, indent: number, data: string) {
		this.lineNumber = lineNumber;
		this.indent = indent;
		this.data = data;
	}

	getLineNumber() {
		return this.lineNumber;
	}
	
	getIndent() {
		return this.indent;
	}
	
	getData() {
		return this.data;
	}

	static create(lineNumber: number, indent: number, data: string) : Line {
		return new Line(lineNumber, indent, data);
	}
}

module.exports = Line;
