const Exporter = require('./exporter'),
	SwaggerExporter = require('./swagger'),
	_ = require('lodash');

const prefix = 'x-stoplight';
const testsPrefix = 'x-tests';


class StopLightX extends Exporter {
	
	_mapEndpoints() {
		let self = this;
		
		self.project.Endpoints.forEach(function (endpoint) {
			self.data.paths[endpoint.Path][endpoint.Method][prefix] = {
				id: endpoint.Id,
				beforeScript: endpoint.Before || null,
				afterScript: endpoint.After || null,
				public: endpoint.Public,
				mock: endpoint.Mock
			};
		});
	};
	
	_mapSchemas() {
		let self = this;
		
		self.project.Schemas.forEach(function (schema) {
			let obj = {
				id: schema.Id,
				name: schema.Name
			};
			if (!_.isEmpty(schema.Summary)) {
				obj.summary = schema.Summary;
			}
			if (!_.isEmpty(schema.Description)) {
				obj.description = schema.Description;
			}
			obj.public = schema.Public;
			
			self.data.definitions[schema.namespace][prefix] = obj;
		});
	};
	
	_mapTests(tests, namespace) {
		return tests.reduce(function (res, test) {
			let exportTest = {
				id: test._id,
				name: test.name,
				initialVariables: {}
			};
			
			try {
				exportTest.initialVariables = JSON.parse(test.initialVariables);
			} catch (e) {
			}
			
			exportTest.steps = test.steps.map(function (step) {
				if (step.test) {
					return {
						$ref: '#/' + namespace + '/' + step.test
					};
				}
				
				let request = step.request;
				
				delete request.endpoint;
				
				if (_.get(request, 'authentication.authType') === 'none') {
					request.authentication = {};
				}
				
				if (!_.get(request, 'postData.params.length') && !_.get(request, 'postData.text.length')) {
					request.postData = {};
				} else {
					delete request.postData.stored;
				}
				
				let assertions = step.assertions.map(function (a) {
					if (a.op && a.op.match(/validate/) && a.value) {
						try {
							a.value = JSON.parse(a.value);
						} catch (e) {
						}
					}
					
					return a;
				});
				
				return {
					id: step._id || step.id,
					name: step.name,
					beforeScript: step.middlewareBefore || step.beforeScript,
					afterScript: step.middlewareAfter || step.afterScript,
					capture: step.capture,
					request: request,
					assertions: assertions
				};
			});
			
			res[test._id] = exportTest;
			
			return res;
		}, {});
	};
	
	_export() {
		let swaggerExporter = new SwaggerExporter();
		
		swaggerExporter.loadProject(this.project);
		swaggerExporter._export();
		this.data = swaggerExporter.data;
		
		let env = this.project.Environment;
		
		this._mapEndpoints();
		this._mapSchemas();
		
		this.data[prefix] = {
			beforeScript: env.MiddlewareBefore,
			afterScript: env.MiddlewareAfter,
			version: env.toJSON(),
			functions: this.project.UtilityFunctions.reduce(function (res, item) {
				res[item.name] = item.toJSON();
				return res;
			}, {}),
			textSections: this.project.Texts.reduce(function (res, item) {
				res[item.Id] = item.toJSON();
				return res;
			}, {})
		};
		
		this.data[testsPrefix] = this._mapTests(this.project.Tests, testsPrefix);
		
		if (env.proxy.mock) {
			this.data[prefix].mock = env.proxy.mock;
		}
	};
	
}

module.exports = StopLightX;
