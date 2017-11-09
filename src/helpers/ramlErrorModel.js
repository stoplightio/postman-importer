const fs = require('fs');
const _ = require('lodash');
const Stack = require('../utils/stack');
const stringsHelper = require('../utils/strings');
const os = require('os');

const methods = ['get', 'post', 'put', 'patch', 'options', 'head', 'delete'];

class RamlErrorModel {

	constructor () {
		this.path = new Stack();
	}

	addErrorNodesFromPath(filePath, model, errors) {
		return errors.forEach(error => {
			const fileContent = fs.readFileSync(filePath, 'utf8');
			this.createPathFromLineNumber(fileContent, error.range.start.line);
			this.addErrorToModel(model, error);
		});
	}
	
	addErrorNodesFromContent(fileContent, model, errors) {
		return errors.forEach(error => {
			this.createPathFromLineNumber(fileContent, error.range.start.line);
			this.addErrorToModel(model, error);
		});
	}
	
	addError(model, field, error) {
		const key = error.isWarning ? 'warning' : 'error';
		if (!model[key]) model[key] = {};
		model[key][field] = error.message;
	}
	
	addErrorToModel(model, error) {
		let elem = this.path.pop();
		if (elem.startsWith('/')) //resources
			this.addErrorToResource(model, elem, error);
		else if (elem === 'types') //types
			this.addErrorToType(model, error);
		else if (elem === 'version' && error.message === "Missing required property 'title'")
			this.addError(model, 'title', error);
		else if (elem === 'documentation')
			this.addErrorToDocumentation(model, error);
		else if (elem === 'baseUriParameters') {
			const param = this.getParameter(model.baseUriParameters, this.path.pop());
			this.addErrorToProp(param.definition, error);
		} else this.addError(model, 'root', error);
	}
	
	addErrorToDocumentation(model, error) {
		const index = this.path.pop();
		const field = error.message === "Missing required property 'title'" ? 'name' : error.message === "Missing required property 'content'" ? 'value' : 'root';
		const item = model.documentation[index];
		if (field === 'name') delete item.name;
		else if (field === 'value') delete item.value;
		this.addError(item, field, error);
	}
	
	addErrorToType(model, error) {
		const typeName = this.path.pop();
		let type = this.getType(model.types, typeName);
		if (this.path.isEmpty()) {
			this.addError(type, 'root', error);
		} else {
			const field = this.path.pop();
			if (this.path.isEmpty()) this.addError(type, field, error);
			else if (field === 'properties') {
				const propName = this.path.pop();
				this.addErrorToProp(this.getProperty(type.properties, propName), error);
			} else if (field === 'example') {
				this.addExampleError(type, error);
			}
		}
	}
	
	addErrorToProp(prop, error) {
		if (this.path.isEmpty()) {
			this.addError(prop, 'root', error);
		} else if (this.path.size() === 1) {
			const field = this.path.pop();
			this.addError(prop, field, error);
		} else if (this.path.pop() === 'properties') {
			const propName = this.path.pop();
			this.addErrorToProp(this.getProperty(prop.properties, propName), error);
		}
	}
	
	addErrorToResource(model, path, error) {
		const resource = this.getResource(model.resources, path);
		if (this.path.isEmpty()) {
			this.addError(resource, 'root', error);
		} else {
			const elem = this.path.pop();
			if (methods.indexOf(elem) === -1) { // uriParameters
				const paramName = this.path.pop();
				let param = this.getParameter(resource.parameters, paramName);
				this.addErrorToProp(param.definition, error);
			} else { // methods
				const method = this.getMethod(resource.methods, elem);
				this.addErrorToResourceProp(method, error);
			}
		}
	}
	
	addErrorToResourceProp(prop, error) {
		if (this.path.isEmpty()) {
			this.addError(prop, 'root', error);
		} else {
			const elem = this.path.pop();
			if (elem === 'body') { // request bodies
				const body = this.getBody(prop.bodies, this.path.pop());
				this.addErrorToProp(body.definition, error);
			} else if (elem === 'queryParameters') { // query parameters
				const param = this.getParameter(prop.parameters, this.path.pop());
				this.addErrorToProp(param.definition, error);
			} else if (elem === 'headers') { // headers
				const header = this.getParameter(prop.headers, this.path.pop());
				this.addErrorToProp(header.definition, error);
			} else if (elem === 'responses') { // responses
				const response = this.getResponse(prop.responses, this.path.pop());
				this.addErrorToResourceProp(response, error);
			} else {
				this.addError(prop, 'root', error);
			}
		}
	}
	
	addExampleError(prop, error) {
		let prefix = '';
		let errorMsg = error.message;
		while (!this.path.isEmpty()) {
			prefix = prefix + (prefix !== '' ? '.' : '') + this.path.pop();
		}
		if (!prop.error) prop.error = {};
		prop.error.example = prefix + ': ' + errorMsg;
	}

	createPathFromLineNumber(fileContent, lineNumber) {
		const lines = fileContent.split(os.EOL);
		const line = lines[lineNumber];
		let lineIndent = stringsHelper.getIndent(line);
		if (line.substr(lineIndent).startsWith('-')) {
			this.createListPath(lines, lineNumber, lineIndent);
		} else {
			this.path.push(_.trimStart(line.substr(0, line.indexOf(':'))));
			let resource = '';
			
			for (let count = lineNumber; count > 0; count--) {
				const currentLine = lines[count];
				const currentIndent = stringsHelper.getIndent(currentLine);
				if (currentIndent < lineIndent) {
					lineIndent = currentIndent;
					let elem = _.trimStart(currentLine.substr(0, currentLine.indexOf(':')));
					if (elem.startsWith('/') && currentIndent > 0) {
						resource = elem + resource;
					} else {
						if (resource !== '') {
							resource = elem + resource;
							this.path.push(resource);
						} else {
							this.path.push(elem);
						}
					}
				}
			}
		}
	}
	
	createListPath(lines, lineNumber, lineIndent) {
		let i = lineNumber;
		let newLineIndent = lineIndent;
		let line = '';
		let index = 0;
		while (newLineIndent >= lineIndent && i >= 0) {
			i = i - 1;
			line = lines[i];
			newLineIndent = stringsHelper.getIndent(line);
			if (line.substr(newLineIndent).startsWith('-')) index = index + 1;
		}
		this.path.push(index + '');
		this.path.push(_.trimStart(line.substr(0, line.indexOf(':'))));
	}

	getBody(bodies, mimeType) {
		return bodies.find(b => {
			return b.mimeType === mimeType;
		});
	}

	getProperty(properties, propName) {
		return properties.find(p => {
			return p.name === propName;
		});
	}

	getType(types, typeName) {
		return types.find(t => {
			return t.name === typeName;
		});
	}
	
	getParameter(parameters, paramName) {
		return parameters.find(p => {
			return p.name === paramName;
		});
	}

	getResponse(methodResponses, statusCode) {
		return methodResponses.find(r => {
			return r.httpStatusCode === statusCode || r.httpStatusCode === statusCode.split("'")[1];
		});
	}

	getMethod(resourceMethods, method) {
		return resourceMethods.find(m => {
			return m.method === method;
		});
	}

	getResource(resources, fullPath) {
		return resources.find(r => {
			return r.path === fullPath;
		});
	}
}


module.exports = RamlErrorModel;
