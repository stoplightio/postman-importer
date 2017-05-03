const _ = require('lodash');

module.exports = {
	
	getValidMethods: ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'],
	
	getValidMimeTypes: ['application/json', 'application/xml', 'text/xml'],
	
	getValidFormDataMimeTypes : ['multipart/form-data', 'application/x-www-form-urlencoded'],
	
	removePropertiesFromObject: function (object, propNames) {
		for (const id in object) {
			if (!object.hasOwnProperty(id)) continue;
		
			const value = object[id];
			if (_.includes(propNames,id)) {
				delete object[id];
			}
			if (typeof value === 'object') {
				this.removePropertiesFromObject(value, propNames);
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
		let traitModels;
		if (model && model.hasOwnProperty('traits')) {
			const resources = model.resources.filter(function(resource) {
				return resource.path === parentResource;
			});
			if (!_.isEmpty(resources) && resources[0].hasOwnProperty('methods')) {
        const resource = resources[0];
        let resourceTraits = model.traits.filter(function (trait) {
          return resource.hasOwnProperty('is') && resource.is.includes(trait.name);
        });
        if (!_.isEmpty(resourceTraits)) traitModels = traitModels ? traitModels.concat(resourceTraits) : resourceTraits;
        if (resource.hasOwnProperty('methods')) {
          const methods = resource.methods.filter(function (method) {
            return method.method === methodName;
          });
          if (!_.isEmpty(methods)) {
            const method = methods[0];
            const methodTraits = model.traits.filter(function (trait) {
              return method.hasOwnProperty('is') && method.is.includes(trait.name);
            });
            if (!_.isEmpty(methodTraits)) traitModels = traitModels ? traitModels.concat(methodTraits) : methodTraits;
          }
        }
			}
		}
		
		return traitModels;
	},
	
	getInheritedResponses: function(model, resourceTypeModel, traitModels) {
		traitModels = traitModels ? traitModels : [];
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
				if (value.hasOwnProperty('is')) {
					const traits = model.traits.filter(function(trait) {
						return trait.name === value.is;
					});
					const names = traitModels.map(function(trait) { return trait.name; })
					if (!_.isEmpty(traits)) {
						const trait = traits[0];
						if (!names.includes(trait.name)) traitModels.push(trait);
					}
				}
			}
		}
		
		for (const id in traitModels) {
			if (!traitModels.hasOwnProperty(id)) continue;
			
			const traitModel = traitModels[id];
			if (traitModel.hasOwnProperty('method')) {
				const method = traitModel.method;
				if (method.hasOwnProperty('responses')) {
					for (const index in method.responses) {
						if (!method.responses.hasOwnProperty(index)) continue;
						
						const val = method.responses[index];
						if (!inheritedResponses.includes(val.httpStatusCode))
							inheritedResponses.push(traitModel.name + ':' + val.httpStatusCode);
					}
				}
			}
		}
		
		return inheritedResponses;
	},
	
	getInheritedBodies: function(traitModels) {
		let inheritedBodies = [];
		for (const id in traitModels) {
			if (!traitModels.hasOwnProperty(id)) continue;
			
			const traitModel = traitModels[id];
			if (traitModel.hasOwnProperty('method') && traitModel.method.hasOwnProperty('bodies')) {
				inheritedBodies = inheritedBodies.concat(traitModel.method.bodies.map(function (body) { return traitModel.name + ':' + body.mimeType; }));
			}
		}
		
		return inheritedBodies;
	},
	
	getInheritedHeaders: function(traitModels) {
		let inheritedHeaders = [];
		for (const id in traitModels) {
			if (!traitModels.hasOwnProperty(id)) continue;
			
			const traitModel = traitModels[id];
			if (traitModel.hasOwnProperty('method') && traitModel.method.hasOwnProperty('headers')) {
				inheritedHeaders = inheritedHeaders.concat(traitModel.method.headers.map(function (header) { return traitModel.name + ':' + header.name ; }));
			}
		}
		
		return inheritedHeaders;
	},
	
	getInheritedParams: function(traitModels) {
		let inheritedParams = [];
		for (const id in traitModels) {
			if (!traitModels.hasOwnProperty(id)) continue;
			
			const traitModel = traitModels[id];
			if (traitModel.hasOwnProperty('method') && traitModel.method.hasOwnProperty('parameters')) {
				inheritedParams = inheritedParams.concat(traitModel.method.parameters.map(function (parameter) { return traitModel.name + ':' + parameter.name ; }));
			}
		}
		
		return inheritedParams;
	}
	
};
