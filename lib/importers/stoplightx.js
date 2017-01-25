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
		const me = this;
		return this.importer.loadFile(path).then(() => {
			me.data = me.importer.data;
		});
	}
	
	loadData(path, options) {
		const me = this;
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
		
		const data = this.importer.data;
		if (!data.hasOwnProperty(prefix)) {
			return;
		}
		const environment = this.project.Environment;
		
		const stoplightData = data[prefix];
		
		if (stoplightData.hasOwnProperty('version')) {
			environment.loadSLData(data[prefix].version);
			//property names are different from db name
			environment.GroupsOrder = data[prefix].version.groups;
			environment.MiddlewareBefore = data[prefix].beforeScript;
			environment.MiddlewareAfter = data[prefix].afterScript;
			
			this.project.Environment = environment;
		}
		
		for (const name in data[prefix].functions) {
			if (!data[prefix].functions.hasOwnProperty(name)) continue;
			
			const ufData = data[prefix].functions[name];
			const uf = new UtilityFunction(ufData.name);
			uf.Description = ufData.description;
			uf.Script = ufData.script;
			this.project.addUtilityFunction(uf);
		}
		
		for (const name in data[prefix].textSections) {
			if (!data[prefix].textSections.hasOwnProperty(name)) continue;
			
			const txtData = data[prefix].textSections[name];
			const txt = new Text(txtData.name);
			txt.Id = txtData.id;
			txt.Content = txtData.content;
			txt.Public = txtData.public;
			this.project.addText(txt);
		}
		
		for (const i in this.project.Endpoints) {
			if (!this.project.Endpoints.hasOwnProperty(i)) continue;
			
			const endpoint = this.project.Endpoints[i];
			const method = data.paths[endpoint.Path][endpoint.Method][prefix];
			
			if (method) {
				endpoint.Before = method['beforeScript'];
				endpoint.After = method['afterScript'];
				endpoint.Mock = method['mock'];
				endpoint.Id = method['id'];
			}
		}
		
		for (const i in this.project.Schemas) {
			if (!this.project.Schemas.hasOwnProperty(i)) continue;
			
			const schema = this.project.Schemas[i];
			const schemaData = data.definitions[schema.NameSpace][prefix];
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
			for (const id in data[testsPrefix]) {
				if (!data[testsPrefix].hasOwnProperty(id)) continue;
				
				const testData = data[testsPrefix][id];
				const test = new Test(testData.name);
				test.Id = testData.id;
				
				if (!_.isEmpty(testData.summary)) {
					test.Summary = testData.summary;
				}
				
				test.InitialVariables = testData.initialVariables;
				test.Steps = testData.steps.map(function (step) {
					if (step.$ref) {
						const parts = step.$ref.split('/');
						const stepId = _.last(parts);
						
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
