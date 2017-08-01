const fs = require('fs');
const _ = require('lodash');

const methods = ['get', 'post', 'put', 'patch', 'options', 'head', 'delete'];

class RamlErrorParser {

	constructor () {
		this.path = [];
	}

	addErrorNodes(filePath, model, errors) {
		return errors.map(error => {
			this.path = _.reverse(RamlErrorParser.getObjectPathFromLineNumber(filePath, error.range.start.line));
			const node = this.getNodeFromPath(model);
			node.error = {
				message: error.message
			};

			return node;
		});
	}

	static getObjectPathFromLineNumber(filePath, lineNumber) {
		const fileContent = fs.readFileSync(filePath, 'utf8');
		const lines = fileContent.split('\n');
		const line = lines[lineNumber];
		let lineIndent = RamlErrorParser.getIndentCount(line);
		const result = [];
		result.push(_.trimStart(line.substr(0, line.indexOf(':'))));

		for (let count = lineNumber; count > 0; count--) {
			const currentLine = lines[count];
			const currentIndent = RamlErrorParser.getIndentCount(currentLine);
			if (currentIndent < lineIndent) {
				lineIndent = currentIndent;
				result.push(_.trimStart(currentLine.substr(0, currentLine.indexOf(':'))));
			}
		}

		return result;
	}

	static getIndentCount(line) {
		const trimStart = _.trimStart(line);
		return line.length - trimStart.length;
	}

	getNodeFromPath(model) {
		const elem = _.first(this.path);
		if (elem.startsWith('/')) {
      //resources
			const resource = this.getResourceNodeFromPath(model.resources);
			if (_.isEmpty(this.path)) return resource;

      //method
			if (methods.indexOf(this.path[0]) > -1) {
				const method = this.getMethodNodeFromPath(resource.methods);
				if (_.isEmpty(this.path)) return method;

        //responses
				if (this.path[0] === 'responses') {
					const response = this.getResponseNodeFromPath(method.responses);
					if (_.isEmpty(this.path)) return response;

          //bodies
					if (this.path[0] === 'body') {
						const body = this.getBodyFromPath(response.bodies);
						if (_.isEmpty(this.path)) return body;
						else return body.definition;
					}
					else
						return response;
				}
			}
		}
	}

	getBodyFromPath(bodies) {
		this.path = _.tail(this.path); //remove body
		const mimeType = this.path[0];

		const result = bodies.filter(b => {
			return b.mimeType === mimeType;
		});

		this.path = _.tail(this.path); //remove mimeType
		if (_.isArray(result) && result.length === 1) return result[0];

		return result;
	}

	getResponseNodeFromPath(methodResponses) {
		this.path = _.tail(this.path); //remove responses

		const result = methodResponses.filter(r => {
			return r.httpStatusCode === this.path[0];
		});

		this.path = _.tail(this.path); //remove status code
		if (_.isArray(result) && result.length === 1) return result[0];

		return result;
	}



	getMethodNodeFromPath(resourceMethods) {
		const result = resourceMethods.filter(m => {
			return m.method === _.head(this.path);
		});

		this.path = _.tail(this.path); //remove method

		if (_.isArray(result) && result.length === 1) return result[0];

		return result;

	}

	getCompleteResourcePath() {
		return _.join(_.remove(this.path, item => {
			return item.startsWith('/');
		}), '');
	}

	getResourceNodeFromPath(resources) {
		const fullPath = this.getCompleteResourcePath();
		const result = resources.filter(r => {
			return r.path === fullPath;
		});

		if (_.isArray(result) && result.length === 1) return result[0];

		return result;
	}
}


module.exports = RamlErrorParser;
