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

	addErrorNodes(filePath, model, errors) {
		return errors.forEach(error => {
			this.createPathFromLineNumber(filePath, error.range.start.line);
			this.addErrorToModel(model, error);
		});
	}
	
	addErrorToModel(model, error) {
		let elem = this.path.pop();
		if (elem.startsWith('/')) //resources
			this.addErrorToResource(model, elem, error);
		else if (elem === 'types') //types
			this.addErrorToType(model, error);
	}
	
	addErrorToType(model, error) {
		const typeName = this.path.pop();
		let type = this.getType(model.types, typeName);
		if (this.path.isEmpty()) {
			if (!type.error) type.error = {};
			type.error.root = error.message;
		} else if (this.path.size() === 1) {
			const field = this.path.pop();
			if (!type.error) type.error = {};
			type.error[field] = error.message;
		} else if (this.path.pop() === 'properties') {
			const propName = this.path.pop();
			this.addErrorToProp(this.getProperty(type.properties, propName), error);
		}
	}
	
	addErrorToProp(prop, error) {
		if (this.path.isEmpty()) {
			if (!prop.error) prop.error = {};
			prop.error.root = error.message;
		} else if (this.path.size() === 1) {
			const field = this.path.pop();
			if (!prop.error) prop.error = {};
			prop.error[field] = error.message;
		} else if (this.path.pop() === 'properties') {
			const propName = this.path.pop();
			this.addErrorToProp(this.getProperty(prop.properties, propName), error);
		}
	}
	
	addErrorToResource(model, path, error) {
		const resource = this.getResource(model.resources, path);
		if (this.path.isEmpty()) {
			if (!resource.error) resource.error = {};
			resource.error.root = error.message;
		}
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
	
	addErrorToResourceProp(prop, error) {
		if (this.path.isEmpty()) {
			if (!prop.error) prop.error = {};
			prop.error.root = error.message;
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
				if (!prop.error) prop.error = {};
				prop.error.root = error.message;
			}
		}
	}

	createPathFromLineNumber(filePath, lineNumber) {
		const fileContent = fs.readFileSync(filePath, 'utf8');
		const lines = fileContent.split(os.EOL);
		const line = lines[lineNumber];
		let lineIndent = stringsHelper.getIndent(line);
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
