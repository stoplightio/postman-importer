// @flow

const Stack = require('../utils/stack');
const stringsHelper = require('../utils/strings');
const os = require('os');
const _ = require('lodash');

class RamlErrorLineNumber {
	
	fileContent: string;
	path: Stack;
	
	constructor (fileContent: string, modelPath : string) {
		this.fileContent = fileContent;
		this.path = Stack.create(modelPath, '.');
	}

	getLineNumber() {
		const line = this.path.pop();
		if (line === 'types') {
			return this.getType();
		}
	}
	
	getLineByContent(data: string, fromLineNumber: number = 0, indent: number = 0) {
		let lineNumber = 0;
		
		const lines = this.fileContent.split(os.EOL);
		lines.every(line => {
			lineNumber = lineNumber + 1;
			if (lineNumber < fromLineNumber) return true;
			return stringsHelper.getIndent(line) !== indent || !line.trim().startsWith(data);
		});

		return lineNumber;
	}
	
	getLineByIndex(index: number, fromLineNumber: number = 0, indent: number) {
		let lineNumber = 0;
		let currentIndex = 0;
		const lines = this.fileContent.split(os.EOL);
		lines.every(line => {
			lineNumber = lineNumber + 1;
			if (lineNumber < fromLineNumber) return true;
			
			if (stringsHelper.getIndent(line) === indent) {
				// eslint-disable-next-line eqeqeq
				if (index == currentIndex) return false;
				currentIndex = currentIndex + 1;
			}
			return true;
		});
		
		return lineNumber;
	}
	
	getType() {
		let lineNumber = this.getLineByContent('types:');
		let indent = 2;
		
		while (!this.path.isEmpty()) {
			const value = this.path.pop();
			lineNumber = _.toNumber(value) ? this.getLineByIndex(value, lineNumber, indent): this.getLineByContent(value, lineNumber, indent);
			if (this.path.isEmpty()) return lineNumber;
			indent = indent + 2;
		}
		
		return lineNumber;
	}
	
}

module.exports = RamlErrorLineNumber;
/*
	info: Info;
	protocols: ?string[];
	baseUri: ?BaseUri;
	mediaType: ?MediaType;
	securityDefinitions: ?SecurityDefinition[];
	resources: ?Resource[];
	types: ?Definition[];
	tags: ?Tag[];
	externalDocs: ?ExternalDocumentation;
	documentation: ?Item[];
	baseUriParameters: ?Parameter[];
	resourceTypes: ?ResourceType[];
	traits: ?Trait[];
	annotationTypes: ?AnnotationType[];
	annotations: ?Annotation[];
	resourceAnnotations: ?Resource;
	responses: ?Response[]; 
*/
