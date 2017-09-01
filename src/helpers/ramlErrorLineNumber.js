// @flow

const Stack = require('../utils/stack');
const Document = require('../utils/document');
const Line = require('../utils/line');

class RamlErrorLineNumber {
	
	document: Document;
	path: Stack;
	
	constructor (fileContent: string, modelPath : string) {
		this.document = Document.create(fileContent);
		this.path = Stack.create(modelPath, '.');
	}

	getLineNumber() : number {
		const line = this.path.pop();
		if (line === 'types') {
			return this.getType();
		}
		
		return -1;
	}
	
	getLineByContent(data: string, fromLineNumber: number = 0, indent: number = 0) : ?Line {
		const partialDoc = this.document.getLinesFrom(fromLineNumber);
		
		for (const l of partialDoc) {
			if (l.getIndent() === indent && l.getData().startsWith(data)) return l;
		}
	}
	
	getLineByIndex(index: number, fromLineNumber: number = 0, indent: number): ?Line  {

		const partialDoc = this.document.getLinesFrom(fromLineNumber);
		let currentIndex = 0;

		for (const l of partialDoc) {
			if (l.getIndent() === indent) {
				if (currentIndex === index) return l;
				else currentIndex = currentIndex + 1;
			}
		}
	}
	
	getType() : number {
		let line: ?Line = this.getLineByContent('types:');
		if (line === undefined || line === null) return -1;
		
		let indent = this.getNextIndent(line);
		
		while (!this.path.isEmpty()) {
			const value : any = this.path.pop();
			if (isNaN(value)) {
				line = this.getLineByContent(value, line.getLineNumber(), indent);
			} else {
				line = this.getLineByIndex(parseInt(value), line.getLineNumber(), indent);
			}
			if (line === undefined || line === null) return -1;
			
			if (this.path.isEmpty()) return line.getLineNumber();
			indent = this.getNextIndent(line);
		}
		
		return line.getLineNumber();
	}
	
	getNextIndent(line: ?Line) : number {
		if (line === undefined || line === null) return 0;
		return this.document.getLine(line.getLineNumber() + 1).getIndent();
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
