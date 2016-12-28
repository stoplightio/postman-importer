const Swagger = require('./swagger'),
	Importer = require('./importer'),
	UtilityFunction = require('../entities/utilityFunction'),
	Text = require('../entities/text'),
	Test = require('../entities/test'),
	_ = require('lodash');

const prefix = 'x-stoplight';
const testsPrefix = 'x-tests';

class StopLightX extends Importer {
	constructor() {
		super();
		this.importer = new Swagger();
	}
	
	loadFile(path) {
		let me = this;
		return this.importer.loadFile(path).then(() => {
			me.data = me.importer.data;
		});
	}
	
	loadData(path, options) {
		let me = this;
		return new Promise(function (resolve, reject) {
			me.importer.loadData(path, options)
				.then(() => {
					me.data = me.importer.data;
					resolve();
				})
				.catch((err) => {
					reject(err);
				});
		});
	}
	
	_import() {
		this.project = this.importer.import();
		
		let data = this.importer.data;
		if (!data.hasOwnProperty(prefix)) {
			return;
		}
		let environment = this.project.Environment;
		
		let stoplightData = data[prefix];
		
		if (stoplightData.hasOwnProperty('version')) {
			environment.loadSLData(data[prefix].version);
			//property names are different from db name
			environment.GroupsOrder = data[prefix].version.groups;
			environment.MiddlewareBefore = data[prefix].beforeScript;
			environment.MiddlewareAfter = data[prefix].afterScript;
			
			this.project.Environment = environment;
		}
		
		for (let name in data[prefix].functions) {
			if (!data[prefix].functions.hasOwnProperty(name)) continue;
			
			let ufData = data[prefix].functions[name];
			let uf = new UtilityFunction(ufData.name);
			uf.Description = ufData.description;
			uf.Script = ufData.script;
			this.project.addUtilityFunction(uf);
		}
		
		for (let name in data[prefix].textSections) {
			if (!data[prefix].textSections.hasOwnProperty(name)) continue;
			
			let txtData = data[prefix].textSections[name];
			let txt = new Text(txtData.name);
			txt.Id = txtData.id;
			txt.Content = txtData.content;
			txt.Public = txtData.public;
			this.project.addText(txt);
		}
		
		for (let i in this.project.Endpoints) {
			if (!this.project.Endpoints.hasOwnProperty(i)) continue;
			
			let endpoint = this.project.Endpoints[i];
			let method = data.paths[endpoint.Path][endpoint.Method][prefix];
			
			if (method) {
				endpoint.Before = method['beforeScript'];
				endpoint.After = method['afterScript'];
				endpoint.Mock = method['mock'];
				endpoint.Id = method['id'];
			}
		}
		
		for (let i in this.project.Schemas) {
			if (!this.project.Schemas.hasOwnProperty(i)) continue;
			
			let schema = this.project.Schemas[i];
			let schemaData = data.definitions[schema.NameSpace][prefix];
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
			for (let id in data[testsPrefix]) {
				if (!data[testsPrefix].hasOwnProperty(id)) continue;
				
				let testData = data[testsPrefix][id];
				let test = new Test(testData.name);
				test.Id = testData.id;
				
				if (!_.isEmpty(testData.summary)) {
					test.Summary = testData.summary;
				}
				
				test.InitialVariables = testData.initialVariables;
				test.Steps = testData.steps.map(function (step) {
					if (step.$ref) {
						let parts = step.$ref.split('/');
						let stepId = _.last(parts);
						
						return {
							test: stepId
						};
					}
					
					return step;
				});
				this.project.addTest(test);
			}
		}
	}
}
module.exports = StopLightX;
