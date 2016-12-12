const jsonHelper = require('../utils/json');

class SavedEntry {
	constructor() {
		this._id = null;
		
		this.request = {
			pathParams: {},
			bodies: [],
			headers: '{}'
		};
	}
	
	get Id() {
		return this._id;
	};
	
	set Id(id) {
		this._id = id;
	};
	
	get Path() {
		return this.request.path;
	};
	
	set Path(path) {
		this.request.path = path;
	};
	
	get Method() {
		return this.request.method;
	};
	
	set Method(requestMethod) {
		this.request.method = requestMethod.toLowerCase();
	};
	
	get Headers() {
		return jsonHelper.parse(this.request.headers);
	};
	
	set Headers(headers) {
		this.request.headers = jsonHelper.stringify(headers, 4);
	};
	
	set Body(body) {
		body.body = jsonHelper.stringify(body.body, 4);
		this.request.bodies.push(body);
	};
	
	get Body() {
		if (Array.isArray(this.request.bodies) && this.request.bodies.length > 0) {
			return this.request.bodies[0];
		}
		return {};
	};
	
	set QueryString(queryString) {
		queryString = jsonHelper.stringify(queryString, 4);
		this.request.queryString = queryString;
	};
	
	get QueryString() {
		if (!this.request.queryString) {
			this.request.queryString = '{}';
		}
		return jsonHelper.parse(this.request.queryString);
	};
	
	set PathParams(uriParams) {
		this.request.pathParams = jsonHelper.stringify(uriParams, 4);
	};
	
	get PathParams() {
		if (!this.request.pathParams) {
			this.request.pathParams = '{}';
		}
		return jsonHelper.parse(this.request.pathParams);
	};
	
	// get Request() { return this.request; };
}

module.exports = SavedEntry;
