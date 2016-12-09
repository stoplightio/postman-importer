var Swagger = require('./swagger'),
    Importer = require('./importer'),
    UtilityFunction = require('../entities/utilityFunction'),
    Text = require('../entities/text'),
    Test = require('../entities/test'),
    fs = require('fs'),
    _ = require('lodash');

var prefix = 'x-stoplight';
var testsPrefix = 'x-tests';

function StopLightX() {
  this.metadata = null;
  this.importer = new Swagger();
}
StopLightX.prototype = new Importer();

StopLightX.prototype.loadFile = function(path){
  var me = this;
  return this.importer.loadFile(path).then(function() {
		me.data = me.importer.data;
	}).catch(function (err) {
		reject(err);
	});
};

StopLightX.prototype.loadData = function(path){
  var me = this;
  return new Promise(function(resolve, reject){
    me.importer.loadData(path)
    .then(function(){
      me.data = me.importer.data;
      resolve();
    })
    .catch(function(err){
      reject(err);
    });
  });
};

StopLightX.prototype._import = function () {
  this.project = this.importer.import();

  var data = this.importer.data;
  if (!data.hasOwnProperty(prefix)) {
    return;
  }
  var environment = this.project.Environment;

  var stoplightData = data[prefix];

  if (stoplightData.hasOwnProperty('version')) {
    environment.loadSLData(data[prefix].version);
    //property names are different from db name
    environment.GroupsOrder = data[prefix].version.groups;
    environment.MiddlewareBefore = data[prefix].beforeScript;
    environment.MiddlewareAfter = data[prefix].afterScript;

    this.project.Environment = environment;
  }

  for (var name in data[prefix].functions) {
    var ufData = data[prefix].functions[name];
    var uf = new UtilityFunction(ufData.name);
    uf.Description = ufData.description;
    uf.Script = ufData.script;
    this.project.addUtilityFunction(uf);
  }

  for (var name in data[prefix].textSections) {
    var txtData = data[prefix].textSections[name];
    var txt = new Text(txtData.name);
    txt.Id = txtData.id;
    txt.Content = txtData.content;
    txt.Public = txtData.public;
    this.project.addText(txt);
  }

  for(var i in this.project.Endpoints) {
    var endpoint = this.project.Endpoints[i];
    var method = data.paths[endpoint.Path][endpoint.Method][prefix];

    if (method) {
      endpoint.Before = method['beforeScript'];
      endpoint.After = method['afterScript'];
      endpoint.Mock = method['mock'];
      endpoint.Id = method['id'];
    }
  }

  for(var i in this.project.Schemas) {
    var schema = this.project.Schemas[i];
    var schemaData = data.definitions[schema.NameSpace][prefix];
    if (schemaData) {
      schema.Id = schemaData.id;
      schema.Name = schemaData.name;

      if (!_.isEmpty(schemaData.summary)) {
        schema.Summary = schemaData.summary;
      }

      schema.Description = schemaData.description;
      schema.Public = schemaData.public;
    }
  }

  if (data.hasOwnProperty(testsPrefix)) {
    for (var id in data[testsPrefix]) {
      var testData = data[testsPrefix][id];
      var test = new Test(testData.name);
      test.Id = testData.id;

      if (!_.isEmpty(testData.summary)) {
        test.Summary = testData.summary;
      }

      test.InitialVariables = testData.initialVariables;
      test.Steps = testData.steps.map(function(step) {
        if (step.$ref) {
          var parts = step.$ref.split('/');
          var stepId = _.last(parts);

          return {
            test: stepId
          };
        }

        return step;
      });
      this.project.addTest(test);
    }
  }
};

module.exports = StopLightX;
