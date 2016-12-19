const expect = require('chai').expect,
	Swagger = require('../../../lib/exporters/swagger'),
	Schema = require('../../../lib/entities/schema'),
	Endpoint = require('../../../lib/entities/endpoint'),
	Project = require('../../../lib/entities/project'),
	Environment = require('../../../lib/entities/environment'),
	SwaggerDefinition = require('../../../lib/entities/swagger/definition'),
	parser = require('swagger-parser'),
	fs = require('fs');

describe('Swagger Exporter', function () {
	let swaggerExporter;
	beforeEach(function () {
		swaggerExporter = new Swagger();
	});
	
	describe('constructor', function () {
		it('should return valid Swagger instance', function () {
			expect(swaggerExporter).to.be.instanceof(Swagger);
		});
		it('should posess generic exporter prototype', function () {
			expect(swaggerExporter).to.respondTo('loadSLData');
			expect(swaggerExporter).to.respondTo('loadProject');
			expect(swaggerExporter).to.respondTo('_export');
			expect(swaggerExporter).to.respondTo('export');
			expect(swaggerExporter).to.respondTo('_getData');
		});
	});
	
	describe('_getResponseTypes', function () {
		it('should include all response mime types from all responses', function () {
			let endpoint = new Endpoint('test');
			endpoint.Produces = ['application/json', 'multipart/form-data'];
			let respTypes = swaggerExporter._getResponseTypes(endpoint);
			expect(respTypes).to.be.an('array');
			expect(respTypes.length).to.equal(2);
			expect(respTypes[0]).to.equal('application/json');
			expect(respTypes[1]).to.equal('multipart/form-data');
		});
	});
	
	describe('_getRequestTypes', function () {
		it('should be no content type for request', function () {
			let endpoint = new Endpoint('test'), requestType, parameters = [];
			endpoint.Body = {};
			parameters.push({
				name: 'myparam',
				in: 'header',
				type: 'string'
			});
			requestType = swaggerExporter._getRequestTypes(endpoint, parameters, []);
			//should assign string type for non valid types
			expect(requestType).to.be.an('array');
			expect(requestType.length).to.eq(0);
			//expect(requestType[0]).to.equal('application/json');
		});
		
		it('should set form data for having file type param', function () {
			let endpoint = new Endpoint('test'), requestType, parameters = [];
			endpoint.Consumes = ['application/json'];
			endpoint.Body = {};
			parameters.push({
				name: 'myparam',
				in: 'body',
				type: 'file'
			});
			requestType = swaggerExporter._getRequestTypes(endpoint, parameters, []);
			//should assign string type for non valid types
			expect(requestType).to.be.an('array');
			expect(requestType.length).to.gt(0);
			expect(requestType[0]).to.equal('multipart/form-data');
		});
		
		it('should include endpoint body type if match for file type', function () {
			let endpoint = new Endpoint('test'), requestType, parameters = [];
			endpoint.Consumes = ['application/x-www-form-urlencoded'];
			parameters.push({
				name: 'myparam',
				in: 'body',
				type: 'file'
			});
			requestType = swaggerExporter._getRequestTypes(endpoint, parameters, []);
			//should assign string type for non valid types
			expect(requestType).to.be.an('array');
			expect(requestType.length).to.gt(0);
			expect(requestType[0]).to.equal('application/x-www-form-urlencoded');
		});
	});
	
	describe('_validateParameters', function () {
		it('should change type not valid parameter types', function () {
			let parameters = [
				{
					name: 'myparam',
					in: 'header',
					type: 'abcd'
				}
			];
			parameters = Swagger._validateParameters(parameters);
			expect(parameters.length).equal(1);
			
			//should assign string type for non valid types
			expect(parameters[0].type).equal('string');
		});
	});
	
	describe('_constructTags', function () {
		it('should return constructed tags from given data', function () {
			let endpoint = new Endpoint('test');
			let env = new Environment();
			
			swaggerExporter.project = new Project('test project');
			endpoint.Id = 'POST_pet';
			
			env.GroupsOrder = {
				docs: [{
					name: 'Pet',
					items: [{
						_id: 'POST_pet',
						type: 'endpoint'
					}]
				}]
			};
			
			expect(swaggerExporter._constructTags(endpoint, env)).to.deep.equal(['Pet']);
		});
	});
	
	describe('_constructSwaggerMethod', function () {
		it('should return constructed swagger method from given data', function () {
			let responses = [], endpoint, parameters = [], env, swaggerMethod;
			
			swaggerExporter.project = new Project('test project');
			
			// endpoint
			endpoint = new Endpoint('test');
			endpoint.Consumes = ['application/json'];
			endpoint.Produces = ['application/json'];
			endpoint.Body = {};
			
			//responses
			responses.push({});
			
			//parameters
			parameters.push({
				name: 'myparam',
				in: 'header',
				type: 'string'
			});
			
			endpoint.SetOperationId(null, 'GET', '/foo/bar/');
			
			env = new Environment();
			env.Consumes = ['application/json'];
			
			swaggerMethod = swaggerExporter._constructSwaggerMethod(endpoint, parameters, responses, env);
			
			expect(swaggerMethod).to.be.an('object');
			expect(swaggerMethod.summary).to.equal('test');
			expect(swaggerMethod.parameters.length).to.equal(1);
			expect(swaggerMethod.responses.length).to.equal(1);
			expect(swaggerMethod.responses.length).to.equal(1);
		});
		
		it('should push only unique items to consumes', function () {
			swaggerExporter.project = new Project('test project');
			
			let endpoint = new Endpoint('test');
			endpoint.Consumes = ['application/json'];
			
			let swaggerMethod = swaggerExporter._constructSwaggerMethod(endpoint, [],
				endpoint.Responses, new Environment());
			expect(swaggerMethod).to.be.an('object');
			
			expect(swaggerMethod.consumes).to.have.lengthOf(1)
				.and.to.include('application/json');
		});
		
		it('should not set consumes mimeType if equals default request type', function () {
			swaggerExporter.project = new Project('test project');
			
			let env = new Environment();
			env.Consumes = ['application/json'];
			env.Produces = ['application/json'];
			
			let endpoint = new Endpoint('test');
			endpoint.Produces = ['application/json'];
			endpoint.Consumes = ['application/json'];
			
			let swaggerMethod = swaggerExporter._constructSwaggerMethod(endpoint, [], endpoint.Responses, env);
			expect(swaggerMethod).to.be.an('object');
			expect(swaggerMethod.consumes).to.be.undefined;
			expect(swaggerMethod.produces).to.be.undefined;
		});
	});
	
	describe('_mapSecurityDefinitions', function () {
		it('should map apiKey security definitions from sl security schemes successfully', function () {
			let schemes = {
				'apiKey': [{
					'headers': [
						{
							'name': 'api_key',
							'value': ''
						}
					],
					'name': 'myApiKey'
				}]
			};
			
			let mappedSchemes;
			
			mappedSchemes = Swagger._mapSecurityDefinitions(schemes);
			expect(Object.keys(mappedSchemes).length).equal(1);
			expect(mappedSchemes.myApiKey).to.be.an('object');
			expect(mappedSchemes.myApiKey).to.have.property('in');
			expect(mappedSchemes.myApiKey.in).to.equal('header');
			expect(mappedSchemes.myApiKey.type).to.equal('apiKey');
		});
		
		it('should able to map oauth2 security definitions successfully', function () {
			let schemes = {
				'oauth2': [{
					'authorizationUrl': 'http://swagger.io/api/oauth/dialog',
					'scopes': [
						{
							'name': 'write:pets',
							'value': 'modify pets in your account'
						},
						{
							'name': 'read:pets',
							'value': 'read your pets'
						}
					],
					'tokenUrl': '',
					'flow': 'accessCode',
					'name': 'myoauth2'
				}]
			};
			
			let mappedSchemes;
			
			mappedSchemes = Swagger._mapSecurityDefinitions(schemes);
			expect(Object.keys(mappedSchemes).length).equal(1);
			
			expect(mappedSchemes.myoauth2).to.be.an('object');
			expect(mappedSchemes.myoauth2).to.have.property('authorizationUrl');
			expect(mappedSchemes.myoauth2).to.have.property('tokenUrl');
			expect(mappedSchemes.myoauth2).to.have.property('flow');
			expect(mappedSchemes.myoauth2).to.have.property('scopes');
			
			//verify individual data
			expect(mappedSchemes.myoauth2.authorizationUrl).to.be.equal('http://swagger.io/api/oauth/dialog');
			expect(mappedSchemes.myoauth2.tokenUrl).to.be.equal('');
			expect(mappedSchemes.myoauth2.scopes).to.be.an('object');
			expect(mappedSchemes.myoauth2.scopes['write:pets']).to.be.equal('modify pets in your account');
			expect(mappedSchemes.myoauth2.scopes['read:pets']).to.be.equal('read your pets');
		});
		it('should map basic security definitions to stoplight successfully', function () {
			let schemes = {
				'basic': [{
					'name': 'test',
					'value': '',
					'description': ''
				}]
			};
			
			let mappedSchemes;
			
			mappedSchemes = Swagger._mapSecurityDefinitions(schemes);
			expect(Object.keys(mappedSchemes).length).equal(1);
			expect(mappedSchemes.test).to.be.an('object');
			expect(mappedSchemes.test.type).to.equal('basic');
		});
	});
	
	describe('_mapEndpointSecurity', function () {
		it('should map apiKey security for endpoint', function () {
			let securedBy = ['myApiKey'];
			let securityDefinitions = {
				apiKey: [{
					headers: [
						{
							name: 'api_key',
							value: ''
						}
					],
					'queryString': [
						{
							'name': 'qs',
							'value': ''
						}
					],
					'name': 'myApiKey'
				}]
			};
			let result = Swagger._mapEndpointSecurity(securedBy, securityDefinitions);
			expect(result).to.be.an('array');
			expect(result.length).to.be.equal(1);
			expect(result[0]).to.be.an('object');
			expect(Object.keys(result[0])[0]).to.be.equal('myApiKey');
		});
		
		it('should map basic security for endpoint', function () {
			let securedBy = ['abcd'];
			let securityDefinitions = {
				basic: [{
					name: 'abcd',
					value: '',
					description: 'test desc'
				}]
			};
			let result = Swagger._mapEndpointSecurity(securedBy, securityDefinitions);
			expect(result).to.be.an('array');
			expect(result.length).to.be.equal(1);
			expect(result[0]).to.be.an('object');
			expect(Object.keys(result[0])[0]).to.be.equal('abcd');
		});
		it('should map oauth2 security for endpoint', function () {
			let securedBy = ['myoauth2'];
			let securityDefinitions = {
				oauth2: [{
					'flow': 'implicit',
					'authorizationUrl': 'http://test-authorization',
					'tokenUrl': '',
					'scopes': [
						{
							'name': 'write:posts',
							'value': ''
						},
					],
					'name': 'myoauth2'
				}]
			};
			let result = Swagger._mapEndpointSecurity(securedBy, securityDefinitions);
			expect(result).to.be.an('array');
			expect(result.length).to.be.equal(1);
			expect(result[0]).to.be.an('object');
			expect(Object.keys(result[0])[0]).to.be.equal('myoauth2');
		});
	});
	
	describe('_mapRequestBody', function () {
		it('should map map request body params and return successfully', function () {
			let stoplightParams = {
				'type': 'object',
				'properties': {
					'id': {
						'description': 'The photo ID',
						'type': 'string'
					},
					'photo': {
						'description': 'The pet photo',
						'type': 'string'
					}
				},
				'required': [
					'photo'
				]
			};
			let stoplightBody = {
				body: JSON.stringify(stoplightParams)
			};
			
			let params = swaggerExporter._mapRequestBody(stoplightBody, ['application/x-www-form-urlencoded']);
			expect(params).to.not.be.undefined;
			expect(params).to.have.lengthOf(2);
		});
		
		it('should map as formData param for file type prop existence', function () {
			let stoplightParams = {
				'type': 'object',
				'properties': {
					'id': {
						'description': 'The photo ID',
						'type': 'string'
					},
					'photo': {
						'description': 'The pet photo',
						'type': 'file'
					}
				},
				'required': [
					'photo'
				]
			};
			let stoplightBody = {
				body: JSON.stringify(stoplightParams)
			};
			
			let params = swaggerExporter._mapRequestBody(stoplightBody);
			expect(params).to.not.be.undefined;
			expect(params.length).to.be.equal(2);
			expect(params[0].name).to.be.equal('id');
			expect(params[1].required).to.be.equal(true);
		});
	});
	
	describe('_mapResponseBody', function () {
		it('should map responses and return successfully', function () {
			let endpoint = new Endpoint('test');
			endpoint.Produces = ['application/json'];
			endpoint.Responses = [
				{
					codes: ['200'],
					example: '',
					description: ''
				},
				{
					codes: ['404'],
					body: '{"$ref": "#/definitions/global:ErrorResponse"}',
					example: '{"errors": [{"field": null, "message": "not found"}]}',
					description: 'not found'
				}
			];
			let res = swaggerExporter._mapResponseBody(endpoint);
			expect(res).to.have.keys('200', '404');
			expect(res).to.have.deep.property('404.schema.$ref', '#/definitions/global:ErrorResponse');
		});
	});
	
	describe('_mapRequestHeaders', function () {
		it('should map request headers successfully');
	});
	
	describe('_mapSchema', function () {
		it('should able to parse sl schemas to swagger schemas as key/schema structure', function () {
			let schemas = [], schema1, schema2, mappedSchemas;
			
			schema1 = new Schema('abcd');
			schema1.Definition = JSON.stringify({
				type: 'object',
				properties: {
					myField: {
						type: 'string'
					}
				},
				required: []
			});
			schemas.push(schema1);
			
			schema2 = new Schema('abcd2');
			schema2.Definition = JSON.stringify({
				type: 'object',
				properties: {
					myField: {
						type: 'string'
					}
				},
				required: []
			});
			schemas.push(schema2);
			
			mappedSchemas = swaggerExporter._mapSchema(schemas);
			expect(Object.keys(mappedSchemas).length).equal(2);
			expect(mappedSchemas.abcd).to.be.an('object');
		});
	});
	
	describe('_mapEndpoints', function () {
		it('should map endpoints successfully');
	});
	
	describe('_mapHostAndProtocol', function () {
		it('Should map host and protocols successfully', function () {
			let swaggerDef = new SwaggerDefinition('test', 'test');
			let env = new Environment();
			env.Host = 'http://localhost:3000';
			env.Protocols = ['http', 'https'];
			swaggerExporter._mapHostAndProtocol(env, swaggerDef);
			expect(swaggerDef.host).to.equal('localhost:3000');
			expect(swaggerDef.schemes).to.be.an('array');
			expect(swaggerDef.schemes.length).to.equal(2);
		});
		it('Should not include host if empty', function () {
			let swaggerDef = new SwaggerDefinition('test', 'test');
			let env = new Environment();
			env.Host = '';
			swaggerExporter._mapHostAndProtocol(env, swaggerDef);
			expect(swaggerDef).to.not.have.property('host');
		});
		it('Should not include protocol if not supported', function () {
			let swaggerDef = new SwaggerDefinition('test', 'test');
			let env = new Environment();
			env.Protocols = ['abcd'];
			swaggerExporter._mapHostAndProtocol(env, swaggerDef);
			expect(swaggerDef.schemes).to.be.an('array');
			expect(swaggerDef.schemes.length).to.equal(0);
		});
		it('Should include protocol from host if available', function () {
			let swaggerDef = new SwaggerDefinition('test', 'test');
			let env = new Environment();
			env.Host = 'https://localhost:3000';
			env.Protocols = [];
			swaggerExporter._mapHostAndProtocol(env, swaggerDef);
			expect(swaggerDef.schemes).to.be.an('array');
			expect(swaggerDef.schemes.length).to.equal(1);
			expect(swaggerDef.schemes[0]).to.equal('https');
		});
	});
	
	describe('_export', function () {
		afterEach(function () {
			fs.unlinkSync('temp.yaml');
		});
		it('should perform export for loaded data', function (done) {
			swaggerExporter.loadSLData(require(__dirname + '/../../data/stoplight.json'))
				.then(function () {
					swaggerExporter.export('yaml')
						.then(function (exportedData) {
							fs.writeFileSync('temp.yaml', exportedData, 'utf8');
							parser.parse('temp.yaml')
								.then(function () {
									done();
								})
								.catch(function (err) {
									expect(err).to.equal(undefined);
									done();
								});
						})
						.catch(function (err) {
							done(err);
						});
				})
				.catch(function (err) {
					return done(err);
				});
		});
	});
	it('shouldn\'t contain duplicate produces values');
});
