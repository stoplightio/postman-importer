// @flow

const Stack = require('../utils/stack');
const stringsHelper = require('../utils/strings');
const os = require('os');

class RamlErrorLineNumber {
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
	
	getLineFromContent(data, fromLineNumber = 0, indentCount = 0) {
		let lineCount = 0;
		
		const lines = this.fileContent.split(os.EOL);
		lines.every(line => {
			lineCount = lineCount + 1;
			if (lineCount < fromLineNumber) return true;
			return stringsHelper.getIndentCount(line) !== indentCount || !line.trim().startsWith(data);
		});

		return lineCount;
	}
	
	getType() {
		let lineNumber = this.getLineFromContent('types:');
		let indent = 2;
		
		while (!this.path.isEmpty()) {
			lineNumber = this.getLineFromContent(this.path.pop(), lineNumber, indent);
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
