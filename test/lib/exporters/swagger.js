var expect   = require('chai').expect,
    Swagger = require('../../../lib/exporters/swagger'),
    Schema = require('../../../lib/entities/schema'),
    Endpoint = require('../../../lib/entities/endpoint'),
    Project = require('../../../lib/entities/project'),
    Environment = require('../../../lib/entities/environment'),
    SwaggerDefinition = require('../../../lib/entities/swagger/definition'),
    parser = require('swagger-parser'),
    fs = require('fs');

describe('Swagger Exporter', function(){
  var swaggerExporter;
  beforeEach(function(){
    swaggerExporter = new Swagger();
  });

  describe('constructor', function(){
    it('should return valid Swagger instance', function(){
      expect(swaggerExporter).to.be.instanceof(Swagger);
    });
    it('should posess generic exporter prototype', function(){
      expect(swaggerExporter).to.respondTo('loadSLData');
      expect(swaggerExporter).to.respondTo('loadProject');
      expect(swaggerExporter).to.respondTo('_export');
      expect(swaggerExporter).to.respondTo('export');
      expect(swaggerExporter).to.respondTo('_getData');
    });
  });

  describe('_getResponseTypes', function(){
    it('should include all response mime types from all responses', function(){
      var responses = [], respTypes;
      responses.push({
        mimeType: 'application/json'
      });
      responses.push({
        mimeType: 'multipart/form-data'
      });
      respTypes = swaggerExporter._getResponseTypes(responses);
      expect(respTypes).to.be.an('array');
      expect(respTypes.length).to.equal(2);
      expect(respTypes[0]).to.equal('application/json');
      expect(respTypes[1]).to.equal('multipart/form-data');
    });
  });

  describe('_getRequestTypes', function(){
    it('should be no content type for request', function(){
      var endpoint = new Endpoint('test'), requestType, parameters = [];
      endpoint.Body = {
        mimeType: ''
      };
      parameters.push({
        name : 'myparam',
        in: 'header',
        type: 'string'
      });
      requestType = swaggerExporter._getRequestTypes(endpoint, parameters, '');
      //should assign string type for non valid types
      expect(requestType).to.be.an('array');
      expect(requestType.length).to.eq(0);
      //expect(requestType[0]).to.equal('application/json');
    });

    it('should set form data for having file type param', function(){
      var endpoint = new Endpoint('test'), requestType, parameters = [];
      endpoint.Body = {
        mimeType: 'application/json'
      };
      parameters.push({
        name : 'myparam',
        in: 'body',
        type: 'file'
      });
      requestType = swaggerExporter._getRequestTypes(endpoint, parameters, '');
      //should assign string type for non valid types
      expect(requestType).to.be.an('array');
      expect(requestType.length).to.gt(0);
      expect(requestType[0]).to.equal('multipart/form-data');
    });

    it('should include endpoint body type if match for file type', function(){
      var endpoint = new Endpoint('test'), requestType, parameters = [];
      endpoint.Body = {
        mimeType: 'application/x-www-form-urlencoded'
      };
      parameters.push({
        name : 'myparam',
        in: 'body',
        type: 'file'
      });
      requestType = swaggerExporter._getRequestTypes(endpoint, parameters, '');
      //should assign string type for non valid types
      expect(requestType).to.be.an('array');
      expect(requestType.length).to.gt(0);
      expect(requestType[0]).to.equal('application/x-www-form-urlencoded');
    });
  });

  describe('_validateParameters', function(){
    it('should change type not valid parameter types', function(){
      var parameters = [
        {
          name : 'myparam',
          in: 'header',
          type: 'abcd'
        }
      ];
      parameters = swaggerExporter._validateParameters(parameters);
      expect(parameters.length).equal(1);

      //should assign string type for non valid types
      expect(parameters[0].type).equal('string');
    });
  });

  describe('_constructTags', function(){
    it('should return constructed tags from given data', function(){
      var endpoint = new Endpoint('test');
      var env = new Environment();

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

  describe('_constructSwaggerMethod', function(){
    it('should return constructed swagger method from given data', function(){
      var responses = [], endpoint, parameters = [], env, swaggerMethod;

      swaggerExporter.project = new Project('test project');

      // endpoint
      endpoint = new Endpoint('test');
      endpoint.Body = {
        mimeType: 'application/json'
      };

      //responses
      responses.push({
        mimeType: 'application/json'
      });

      //parameters
      parameters.push({
        name : 'myparam',
        in: 'header',
        type: 'string'
      });

      endpoint.SetOperationId(null, 'GET', '/foo/bar/');

      env = new Environment();
      env.DefaultRequestType = 'application/json';

      swaggerMethod = swaggerExporter._constructSwaggerMethod(endpoint, parameters, responses, env);

      expect(swaggerMethod).to.be.an('object');
      expect(swaggerMethod.summary).to.equal('test');
      expect(swaggerMethod.parameters.length).to.equal(1);
      expect(swaggerMethod.responses.length).to.equal(1);
      expect(swaggerMethod.responses.length).to.equal(1);
    });

    it('should set consumes and produce to an empty array for endpoints with mimeType = null', function() {
      swaggerExporter.project = new Project('test project');

      var endpoint = new Endpoint('test');
      endpoint.Body = {
        mimeType: null
      };
      endpoint.Responses = [{
        mimeType: null
      }];

      var env = new Environment();
      env.DefaultRequestType = 'application/json';

      var swaggerMethod = swaggerExporter._constructSwaggerMethod(endpoint, [], endpoint.Responses, env);
      expect(swaggerMethod).to.be.an('object');
      expect(swaggerMethod.consumes).to.be.an('array').and.to.be.an.empty;
      expect(swaggerMethod.produces).to.be.an('array').and.to.be.an.empty;
    });

    it('should push only unique items to consumes', function() {
      swaggerExporter.project = new Project('test project');

      var endpoint = new Endpoint('test');
      endpoint.Body = {
        mimeType: null
      };
      endpoint.Body = {
        mimeType: 'application/json'
      };
      endpoint.Body = {
        mimeType: 'application/json'
      };

      var swaggerMethod = swaggerExporter._constructSwaggerMethod(endpoint, [],
        endpoint.Responses, new Environment());
      expect(swaggerMethod).to.be.an('object');

      expect(swaggerMethod.consumes).to.have.lengthOf(1)
        .and.to.include('application/json');
    });

    it('should not set consumes mimeType is equals to default request type', function() {
      swaggerExporter.project = new Project('test project');

      var endpoint = new Endpoint('test');
      endpoint.Body = {
        mimeType: 'application/json'
      };
      endpoint.Responses = [{
        mimeType: 'application/json'
      }];

      var env = new Environment();
      env.DefaultRequestType = 'application/json';
      env.defaultResponseType = 'application/json';

      var swaggerMethod = swaggerExporter._constructSwaggerMethod(endpoint, [], endpoint.Responses, env);
      expect(swaggerMethod).to.be.an('object');
      expect(swaggerMethod.consumes).to.be.an('undefined');
      expect(swaggerMethod.produces).to.be.an('undefined');
    });
  });

  describe('_mapSecurityDefinitions', function(){
    it('should map apiKey security definitions from sl security schemes successfully', function(){
      var schemes = {
        'apiKey' : {
          'headers' : [
            {
              'name' : 'api_key',
              'value' : ''
            }
          ]
        }
      };

      var mappedSchemes;

      mappedSchemes = swaggerExporter._mapSecurityDefinitions(schemes);
      expect(Object.keys(mappedSchemes).length).equal(1);
      expect(mappedSchemes.api_key).to.be.an('object');
      expect(mappedSchemes.api_key).to.have.property('in');
      expect(mappedSchemes.api_key.in).to.equal('header');
      expect(mappedSchemes.api_key.type).to.equal('apiKey');
    });

    it('should able to map oauth2 security definitions successfully', function(){
        var schemes = {
          'oauth2' : {
              'authorizationUrl' : 'http://swagger.io/api/oauth/dialog',
              'scopes' : [
                  {
                      'name' : 'write:pets',
                      'value' : 'modify pets in your account'
                  },
                  {
                      'name' : 'read:pets',
                      'value' : 'read your pets'
                  }
              ],
              'tokenUrl' : '',
              'flow' : 'accessCode'
          }
        };

        var mappedSchemes;

        mappedSchemes = swaggerExporter._mapSecurityDefinitions(schemes);
        expect(Object.keys(mappedSchemes).length).equal(1);

        expect(mappedSchemes.oauth2).to.be.an('object');
        expect(mappedSchemes.oauth2).to.have.property('authorizationUrl');
        expect(mappedSchemes.oauth2).to.have.property('tokenUrl');
        expect(mappedSchemes.oauth2).to.have.property('flow');
        expect(mappedSchemes.oauth2).to.have.property('scopes');

        //verify individual data
        expect(mappedSchemes.oauth2.authorizationUrl).to.be.equal('http://swagger.io/api/oauth/dialog');
        expect(mappedSchemes.oauth2.tokenUrl).to.be.equal('');
        expect(mappedSchemes.oauth2.scopes).to.be.an('object');
        expect(mappedSchemes.oauth2.scopes['write:pets']).to.be.equal('modify pets in your account');
        expect(mappedSchemes.oauth2.scopes['read:pets']).to.be.equal('read your pets');
      });
    it('should map basic security definitions to stoplight successfully', function(){
      var schemes = {
        'basic' : {
          'name' : 'test',
          'value' : '',
          'description' : ''
        }
      };

      var mappedSchemes;

      mappedSchemes = swaggerExporter._mapSecurityDefinitions(schemes);
      expect(Object.keys(mappedSchemes).length).equal(1);
      expect(mappedSchemes.test).to.be.an('object');
      expect(mappedSchemes.test.type).to.equal('basic');
    });
  });

  describe('_mapEndpointSecurity', function(){
    it('should map apiKey security for endpoint', function(){
      var securedBy = {
        none: true,
        apiKey: true
      };
      var securityDefinitions = {
        apiKey: {
          headers: [
            {
              name: 'api_key',
              value: ''
            }
          ],
          'queryString' : [
            {
              'name' : 'qs',
              'value' : ''
            }
          ]
        }
      };
      var result = swaggerExporter._mapEndpointSecurity(securedBy, securityDefinitions);
      expect(result).to.be.an('array');
      expect(result.length).to.be.equal(2);
      expect(result[0]).to.be.an('object');
      expect(Object.keys(result[0])[0]).to.be.equal('api_key');
      expect(Object.keys(result[1])[0]).to.be.equal('qs');
    });

    it('should map basic security for endpoint', function(){
      var securedBy = {
        none: true,
        basic: true
      };
      var securityDefinitions = {
        basic: {
          name: 'abcd',
          value: '',
          description: 'test desc'
        }
      };
      var result = swaggerExporter._mapEndpointSecurity(securedBy, securityDefinitions);
      expect(result).to.be.an('array');
      expect(result.length).to.be.equal(1);
      expect(result[0]).to.be.an('object');
      expect(Object.keys(result[0])[0]).to.be.equal('abcd');
    });
    it('should map oauth2 security for endpoint', function(){
      var securedBy = {
        none: true,
        oauth2: true
      };
      var securityDefinitions = {
        oauth2 : {
            'flow' : 'implicit',
            'authorizationUrl' : 'http://test-authorization',
            'tokenUrl' : '',
            'scopes' : [
                {
                    'name' : 'write:posts',
                    'value' : ''
                }
            ]
        }
      };
      var result = swaggerExporter._mapEndpointSecurity(securedBy, securityDefinitions);
      expect(result).to.be.an('array');
      expect(result.length).to.be.equal(1);
      expect(result[0]).to.be.an('object');
      expect(Object.keys(result[0])[0]).to.be.equal('oauth2');
    });
  });

  describe('_mapRequestBody', function(){
    it('should map map request body params and return successfully', function(){
      var stoplightParams = {
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
      var stoplightBody = {
        body: JSON.stringify(stoplightParams)
      };

      var params = swaggerExporter._mapRequestBody(stoplightBody, ['application/x-www-form-urlencoded']);
      expect(params).to.not.be.undefined;
      expect(params).to.have.lengthOf(2);
    });

    it('should map as formData param for file type prop existence', function(){
      var stoplightParams = {
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
      var stoplightBody = {
        body: JSON.stringify(stoplightParams)
      };

      var params = swaggerExporter._mapRequestBody(stoplightBody);
      expect(params).to.not.be.undefined;
      expect(params.length).to.be.equal(2);
      expect(params[0].name).to.be.equal('id');
      expect(params[1].required).to.be.equal(true);
    });
  });

  describe('_mapResponseBody', function() {
    it('should map responses and return successfully', function() {
      var responses = [
        {
          mimeType: null,
          codes: ['200'],
          body: '{"type": "null"}',
          example: '',
          description: ''
        },
        {
          mimeType: 'application/json',
          codes: ['404'],
          body: '{"$ref": "#/definitions/global:ErrorResponse"}',
          example: '{"errors": [{"field": null, "message": "not found"}]}',
          description: 'not found'
        }
      ];
      var res = swaggerExporter._mapResponseBody(responses);

      expect(res).to.have.keys('200', '404');
      expect(res['200']).to.have.key('description');
      expect(res).to.have.deep.property('404.schema.$ref', '#/definitions/global:ErrorResponse');
    });
  });

  describe('_mapRequestHeaders', function(){
    it('should map request headers successfully');
  });

  describe('_mapSchema', function(){
    it('should able to parse sl schemas to swagger schemas as key/schema structure', function(){
      var schemas = [], schema1, schema2, mappedSchemas;

      schema1 = new Schema('abcd');
      schema1.Definition = JSON.stringify({
        type: 'object',
        properties:
          {myField:
            {
              type: 'string'
            }
          },
          required: []
        });
      schemas.push(schema1);

      schema2 = new Schema('abcd2');
      schema2.Definition = JSON.stringify({
        type: 'object',
        properties:
          {myField:
            {
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

  describe('_mapEndpoints', function(){
    it('should map endpoints successfully');
  });

  describe('_mapHostAndProtocol', function(){
    it('Should map host and protocols successfully', function(){
      var swaggerDef = new SwaggerDefinition('test', 'test');
      var env = new Environment();
      env.Host = 'http://localhost:3000';
      env.Protocols = ['http', 'https'];
      swaggerExporter._mapHostAndProtocol(env, swaggerDef);
      expect(swaggerDef.host).to.equal('localhost:3000');
      expect(swaggerDef.schemes).to.be.an('array');
      expect(swaggerDef.schemes.length).to.equal(2);
    });
    it('Should not include host if empty', function(){
      var swaggerDef = new SwaggerDefinition('test', 'test');
      var env = new Environment();
      env.Host = '';
      swaggerExporter._mapHostAndProtocol(env, swaggerDef);
      expect(swaggerDef).to.not.have.property('host');
    });
    it('Should not include protocol if not supported', function(){
      var swaggerDef = new SwaggerDefinition('test', 'test');
      var env = new Environment();
      env.Protocols = ['abcd'];
      swaggerExporter._mapHostAndProtocol(env, swaggerDef);
      expect(swaggerDef.schemes).to.be.an('array');
      expect(swaggerDef.schemes.length).to.equal(0);
    });
    it('Should include protocol from host if available', function(){
      var swaggerDef = new SwaggerDefinition('test', 'test');
      var env = new Environment();
      env.Host = 'https://localhost:3000';
      env.Protocols = [];
      swaggerExporter._mapHostAndProtocol(env, swaggerDef);
      expect(swaggerDef.schemes).to.be.an('array');
      expect(swaggerDef.schemes.length).to.equal(1);
      expect(swaggerDef.schemes[0]).to.equal('https');
    });
  });

  describe('_export', function(){
    it('should perform export for loaded data', function(done){
      swaggerExporter.loadSLData(require(__dirname+'/../../data/stoplight.json'), function(err){
        if (err)return done(err);
        swaggerExporter.export('yaml')
        .then(function(exportedData){
          fs.writeFileSync('temp.yaml', exportedData, 'utf8');
          parser.parse('temp.yaml')
          .then(function(api, metadata) {
            done();
          })
          .catch(function(err) {
            expect(err).to.equal(undefined);
            done();
          });
        })
        .catch(function(err){
          done(err);
        });
      });
    });
    it('shouldn\'t contain duplicate produces values');
  });
});
