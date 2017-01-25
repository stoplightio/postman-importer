const Endpoint = require('../entities/endpoint'),
	Project = require('../entities/project'),
	Schema = require('../entities/schema'),
	UtilityFunction = require('../entities/utilityFunction'),
	Text = require('../entities/text'),
	Importer = require('./importer'),
	fs = require('fs');

class StopLight extends Importer {
	constructor() {
		super();
		this.metadata = null;
	}
	
	loadFile(path, cb) {
		try {
			this.data = JSON.parse(fs.readFileSync(path, 'utf8'));
			cb();
		}
		catch (err) {
			cb(err);
		}
	}
	
	_mapSchema() {
		for (const i in this.data.project.schemas) {
			if (!this.data.project.schemas.hasOwnProperty(i)) continue;
			
			const schemaData = this.data.project.schemas[i];
			schemaData.namespace = schemaData.namespace.replace('#/definitions/', '');
			const schema = new Schema(schemaData.namespace);
			schema.SLData = schemaData;
			this.project.addSchema(schema);
		}
	}
	
	mapEndpoint() {
		//all formats are going throught stoplight endpoint, no need to map itself
		for (const i in this.data.project.endpoints) {
			if (!this.data.project.endpoints.hasOwnProperty(i)) continue;
			
			const endpointData = this.data.project.endpoints[i];
			const endpoint = new Endpoint('');
			endpoint.SLData = endpointData;
			this.project.addEndpoint(endpoint);
		}
	}
	
	mapUtilityFunctions() {
		for (const i in this.data.project.utilityFunctions) {
			const ufData = this.data.project.utilityFunctions[i];
			const uf = new UtilityFunction(ufData.name);
			uf.Description = ufData.description;
			uf.Script = ufData.script;
			this.project.addUtilityFunction(uf);
		}
	}
	
	mapTexts() {
		for (const i in this.data.project.texts) {
			const txt = this.data.project.texts[i];
			const text = new Text(txt.name);
			text.Id = txt._id;
			text.Name = txt.name;
			text.Content = txt.content;
			text.Public = txt.public;
			this.project.addText(text);
		}
	}
	
	mapTraits() {
		this.project.traits = this.data.project.traits;
	}
	
	mapSecuritySchemes() {
		this.project.SecuritySchemes = this.data.project.securitySchemes;
	}
	
	_import() {
		if (!this.data.project) {
			throw new Error('Invalid formatted stoplight data');
		}
		
		this.project = new Project(this.data.project.name);
		this.project.loadSLData(this.data.project);
		
		this.project.Environment.loadSLData(this.data.project.environment);
		
		this.mapEndpoint();
		
		this._mapSchema();
		
		this.mapUtilityFunctions();
		
		this.mapSecuritySchemes();
		
		this.mapTexts();
		
		this.mapTraits();
		
		if (this.data.project.resourcesOrder) {
			this.project.GroupsOrder = this.data.project.resourcesOrder;
		}
	}
}
module.exports = StopLight;
