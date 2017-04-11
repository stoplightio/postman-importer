const _ = require('lodash');

module.exports = {
	
	getValidMethods: ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'],
	
	getValidMimeTypes: ['application/json', 'application/xml', 'text/xml'],
	
	removePropertyFromObject: function (object, propName) {
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;
		
			const value = object[id];
			if (id === propName) {
				delete object[id];
			}
			if (typeof value === 'object') {
				this.removePropertyFromObject(value, propName);
			}
		}
	},
	
	getResponseName(method, code) {
		return method + ':' + code;
	},
	
	getResourceTypeModel: function (model, parentResource) {
		let resourceTypeModel;
		if (model) {
			const resources = model.resources.filter(function(resource) {
				return resource.path === parentResource;
			});
			if (!_.isEmpty(resources) && resources[0].hasOwnProperty('resourceType')) {
				const resourceTypes = model.resourceTypes.filter(function (resourceType) {
					return resourceType.name === resources[0].resourceType;
				});
				if (!_.isEmpty(resourceTypes)) resourceTypeModel = resourceTypes[0];
			}
		}
		
		return resourceTypeModel;
	},
	
	getTraitModel: function (model, parentResource, methodName) {
		let traitModel;
		if (model && model.hasOwnProperty('traits')) {
			const resources = model.resources.filter(function(resource) {
				return resource.path === parentResource;
			});
			if (!_.isEmpty(resources) && resources[0].hasOwnProperty('methods')) {
				const methods = resources[0].methods.filter(function (method) {
					return method.method === methodName;
				});
				if (!_.isEmpty(methods)) {
					const method = methods[0];
					const traits = model.traits.filter(function (trait) {
						return method.hasOwnProperty('is') && trait.name === method.is[0];
					})
					if (!_.isEmpty(traits)) traitModel = traits[0];
				}
			}
		}
		
		return traitModel;
	},
	
	getInheritedResponses: function(resourceTypeModel, traitModel) {
		const inheritedResponses = [];
		if (resourceTypeModel && resourceTypeModel.hasOwnProperty('resource') &&
			resourceTypeModel.resource.hasOwnProperty('methods')) {
			for (const id in resourceTypeModel.resource.methods) {
				if (!resourceTypeModel.resource.methods.hasOwnProperty(id)) continue;
				
				const value = resourceTypeModel.resource.methods[id];
				if (value.hasOwnProperty('responses')) {
					for (const index in value.responses) {
						if (!value.responses.hasOwnProperty(index)) continue;
						
						const val = value.responses[index];
						inheritedResponses.push(this.getResponseName(value.method, val.httpStatusCode));
					}
				}
			}
		}
		
		if (traitModel && traitModel.hasOwnProperty('method')) {
			const method = traitModel.method;
			if (method.hasOwnProperty('responses')) {
				for (const index in method.responses) {
					if (!method.responses.hasOwnProperty(index)) continue;
					
					const val = method.responses[index];
					inheritedResponses.push(val.httpStatusCode);
				}
			}
		}
		
		return inheritedResponses;
	},
	
	getInheritedBodies: function(traitModel) {
		let inheritedBodies = [];
		if (traitModel && traitModel.hasOwnProperty('method') && traitModel.method.hasOwnProperty('bodies')) {
			inheritedBodies = traitModel.method.bodies.map(function (body) { return body.mimeType; });
		}
		
		return inheritedBodies;
	},
	
	getInheritedHeaders: function(traitModel) {
		let inheritedHeaders = [];
		if (traitModel && traitModel.hasOwnProperty('method') && traitModel.method.hasOwnProperty('headers')) {
			inheritedHeaders = traitModel.method.headers.map(function (header) { return header.name; });
		}
		
		return inheritedHeaders;
	},
	
	getInheritedParams: function(traitModel) {
		let inheritedParams = [];
		if (traitModel && traitModel.hasOwnProperty('method') && traitModel.method.hasOwnProperty('parameters')) {
			inheritedParams = traitModel.method.parameters.map(function (parameter) { return parameter.name; });
		}
		
		return inheritedParams;
	}
	
};
