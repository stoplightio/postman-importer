const fs = require('fs');
const _ = require('lodash');
const Stack = require('../utils/stack');

const methods = ['get', 'post', 'put', 'patch', 'options', 'head', 'delete'];

class RamlErrorParser {

	constructor () {
		this.path = new Stack();
	}

	addErrorNodes(filePath, model, errors) {
		return errors.map(error => {
			this.createtObjectPathFromLineNumber(filePath, error.range.start.line);
			const node = this.getNodeFromPath(model);
			node.error = {
				message: error.message
			};

			return node;
		});
	}

	createtObjectPathFromLineNumber(filePath, lineNumber) {
		const fileContent = fs.readFileSync(filePath, 'utf8');
		const lines = fileContent.split('\n');
		const line = lines[lineNumber];
		let lineIndent = RamlErrorParser.getIndentCount(line);
		this.path.push(_.trimStart(line.substr(0, line.indexOf(':'))));
		let resource = '';

		for (let count = lineNumber; count > 0; count--) {
			const currentLine = lines[count];
			const currentIndent = RamlErrorParser.getIndentCount(currentLine);
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

	getNodeFromPath(model) {
		let elem = this.path.pop();
		if (elem.startsWith('/')) {
      //resources
			const resource = this.getResourceNodeFromPath(model.resources, elem);
			if (this.path.isEmpty()) return resource;

      //method
			elem = this.path.pop();
			if (methods.indexOf(elem) > -1) {
				const method = this.getMethodNodeFromPath(resource.methods, elem);
				if (_.isEmpty(this.path)) return method;

        //responses
				elem = this.path.pop();
				if (elem === 'responses') {
					const statusCode = this.path.pop();
					const response = this.getResponseNodeFromPath(method.responses, statusCode);
					if (this.path.isEmpty()) return response;

          //bodies
					elem = this.path.pop();
					if (elem === 'body') {
						const mimeType = this.path.pop();
						const body = this.getBodyFromPath(response.bodies, mimeType);
						if (this.path.isEmpty()) return body;
						else return body.definition;
					}
					else
						return response;
				}
			}
		}
		else if (elem === 'types') {
			const typeName = this.path.pop();
			return this.getTypeFromPath(model.types, typeName);
		}
	}

	getTypeFromPath(types, typeName) {
		const result = types.filter(t => {
			return t.name === typeName;
		});

		if (this.path.isEmpty() || this.path.size() === 1) {
			if (_.isArray(result) && result.length === 1) return result[0];

			return result;
		}
	}

	getBodyFromPath(bodies, mimeType) {
		const result = bodies.filter(b => {
			return b.mimeType === mimeType;
		});

		if (_.isArray(result) && result.length === 1) return result[0];

		return result;
	}

	getResponseNodeFromPath(methodResponses, statusCode) {
		const result = methodResponses.filter(r => {
			return r.httpStatusCode === statusCode;
		});

		if (_.isArray(result) && result.length === 1) return result[0];

		return result;
	}



	getMethodNodeFromPath(resourceMethods, method) {
		const result = resourceMethods.filter(m => {
			return m.method === method;
		});

		if (_.isArray(result) && result.length === 1) return result[0];

		return result;

	}

	getResourceNodeFromPath(resources, fullPath) {
		const result = resources.filter(r => {
			return r.path === fullPath;
		});

		if (_.isArray(result) && result.length === 1) return result[0];

		return result;
	}
}


module.exports = RamlErrorParser;
