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
			return this.getTypeLine();
		} else if (line === 'resources') {
			return this.getResourceLine();
		}
		
		return -1;
	}
	
	getLineByContent(data: string, fromLineNumber: number = 0, indent: number = -1) : ?Line {
		const partialDoc = this.document.getLinesFrom(fromLineNumber);
		
		for (const l of partialDoc) {
			if ((indent === -1 || l.getIndent() === indent) && l.getData().startsWith(data)) return l;
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
	
	getTypeLine() : number {
		let line: ?Line = this.getLineByContent('types:');
		if (line === undefined || line === null) return -1;
		
		let indent = this.getNextIndent(line);
		
		while (!this.path.isEmpty()) {
			const value : any = this.path.pop();
			line = isNaN(value) ? this.getLineByContent(value, line.getLineNumber(), indent) : this.getLineByIndex(parseInt(value), line.getLineNumber(), indent);
			if (line === undefined || line === null) return -1;
			
			if (this.path.isEmpty()) return line.getLineNumber();
			indent = this.getNextIndent(line);
		}
		
		return line.getLineNumber();
	}

	getResourceLine() : number {
		//discard resources
		//iterates over lines starting with /
		
		const resourceIndex : any = this.path.pop();
		let line : ?Line;
		let fromLine : number = 0;

		for (let index = 0; index <= parseInt(resourceIndex); index = index + 1) {
			line = this.getLineByContent('/', fromLine);
			if (line === undefined || line === null) return -1;
			fromLine = line.getLineNumber() + 1;
		}
		
		let indent : number = this.getNextIndent(line);
		
		while (!this.path.isEmpty()) {
			const value : any = this.path.pop();
			if (value === 'methods' || value === 'mimeType' || value === 'definition') continue;
			else if (value === 'bodies')
				/*$ExpectError*/
				line = this.getLineByContent('body', line.getLineNumber(), indent);
			else if (value === 'parameters')
			/*$ExpectError*/
				line = this.getLineByContent('queryParameters', line.getLineNumber(), indent);
			else if (isNaN(value))
				/*$ExpectError*/
				line = this.getLineByContent(value, line.getLineNumber(), indent);
			else
				/*$ExpectError*/
				line = this.getLineByIndex(parseInt(value), line.getLineNumber(), indent);
			
			if (line === undefined || line === null) return -1;

			if (this.path.isEmpty()) return line.getLineNumber();
			indent = this.getNextIndent(line);
		}

		/*$ExpectError*/
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
