const expect   = require('chai').expect,
    Project = require('../../../lib/entities/project'),
    fs = require('fs');

describe('Project Entity', function() {
  describe('constructor', function(){
    it('should create valid instance');
  });

  describe('getters', function(){
    it('should return list of endpoints through Endpoints getter');
    it('should return list of schemas through Schemas getter');
    it('should return list of security schemes through SecuritySchemes getter');
    it('should return list of utility functions through UtilityFunctions getter');
    it('should return endpoints order functions through EndpointsOrder getter');
  });

  describe('addEndpoint', function(){
    it('should be able to an endpoint');
  });

  describe('addGroup', function(){
    it('should be able to add new group');
  });

  describe('addSchema', function(){
    it('should be able to add schema');
  });

});
