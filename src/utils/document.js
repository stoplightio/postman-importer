// @flow
const os = require('os');
const stringsHelper = require('./strings');
const Line = require('./line');

class Document {

	data: Line[];

	constructor(data: Line[]) {
		this.data = data;
	}
	
	getLine(lineNumber: number) : Line {
		return this.data[lineNumber - 1];
	}
	
	getLinesFrom(lineNumber: number) : Line[] {
		return this.data.slice(lineNumber === 0 ? 0 : lineNumber - 1);
	}

	static create(content: string) : Document {
		const lines = content.split(os.EOL);
		let lineNumber = 0;
		const result = [];
		
		lines.forEach(line => {
			lineNumber = lineNumber + 1;
			const indent = stringsHelper.getIndent(line);
			const data = line.trim();
			
			result.push(new Line(lineNumber, indent, data));
		});
		
		return new Document(result);
	}
}

module.exports = Document;
