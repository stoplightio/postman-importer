const fs = require('fs');
const _ = require('lodash');
const Stack = require('../utils/stack');

const methods = ['get', 'post', 'put', 'patch', 'options', 'head', 'delete'];

class RamlErrorModel {

	constructor () {
		this.path = new Stack();
	}

	addErrorNodes(filePath, model, errors) {
		return errors.map(error => {
			this.createPathFromLineNumber(filePath, error.range.start.line);
			const node = this.getErrorNode(model);
			node.error = {
				message: error.message
			};

			return node;
		});
	}

	createPathFromLineNumber(filePath, lineNumber) {
		const fileContent = fs.readFileSync(filePath, 'utf8');
		const lines = fileContent.split('\n');
		const line = lines[lineNumber];
		let lineIndent = RamlErrorModel.getIndentCount(line);
		this.path.push(_.trimStart(line.substr(0, line.indexOf(':'))));
		let resource = '';

		for (let count = lineNumber; count > 0; count--) {
			const currentLine = lines[count];
			const currentIndent = RamlErrorModel.getIndentCount(currentLine);
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

	static getIndentCount(line) {
		const trimStart = _.trimStart(line);
		return line.length - trimStart.length;
	}

	getErrorNode(model) {
		let elem = this.path.pop();
		if (elem.startsWith('/')) //resources
			return this.getNodeFromResource(model, elem);
		else if (elem === 'types') //types
			return this.getNodeFromTypes(model);
	}

	getNodeFromTypes(model) {
		const typeName = this.path.pop();
		let nodeType = this.getType(model.types, typeName);
		if (this.path.isEmpty() || this.path.size() === 1){
			return nodeType;
		}

		while (this.path.size() > 1) {
			const elem = this.path.pop();
			if (elem === 'properties') {
				const propName = this.path.pop();
				nodeType = this.getProperty(nodeType.properties, propName);
			} else {
				nodeType = nodeType[elem];
			}
		}

		return nodeType;
	}

	getNodeFromResource(model, elem) {
		const resource = this.getResource(model.resources, elem);
		if (this.path.isEmpty())
			return resource;

		//method
		elem = this.path.pop();
		if (methods.indexOf(elem) > -1) {
			const method = this.getMethod(resource.methods, elem);
			if (this.path.isEmpty())
				return method;

			//responses
			elem = this.path.pop();
			if (elem === 'responses') { //responses
				const statusCode = this.path.pop();
				const response = this.getResponse(method.responses, statusCode);
				if (this.path.isEmpty())
					return response;

				//bodies
				elem = this.path.pop();
				if (elem === 'body')
					return this.getBody(response);
				else
					return response;
			} else if (elem === 'body')  //request
				return this.getBody(method);
		}
	}

	getBody(method) {
		const mimeType = this.path.pop();
		const body = method.bodies.find(b => {
			return b.mimeType === mimeType;
		});
		if (this.path.isEmpty()) return body;
		else return body.definition;
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

	getResponse(methodResponses, statusCode) {
		return methodResponses.find(r => {
			return r.httpStatusCode === statusCode;
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
