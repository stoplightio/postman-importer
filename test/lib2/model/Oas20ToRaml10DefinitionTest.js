const expect = require('chai').expect;
const beforeEach = require("mocha/lib/mocha.js").beforeEach;
const afterEach = require("mocha/lib/mocha.js").afterEach;
const it = require("mocha/lib/mocha.js").it;
const describe = require("mocha/lib/mocha.js").describe;
const Oas = require('../../../lib/importers/swagger');
const Oas20DefinitionConverter = require('../../../lib/oas20/Oas20DefinitionConverter');
const Raml = require('../../../lib/importers/baseraml');
const Raml10DefinitionConverter = require('../../../lib/raml10/Raml10DefinitionConverter');
const YAML = require('js-yaml');
const fs = require('fs');
const _ = require('lodash');

function removePropertyFromObject(object, propName) {
	for (const id in object) {
		if (!object.hasOwnProperty(id)) continue;

		const value = object[id];
		if (id === propName) {
			delete object[id];
		}
		if (typeof value === 'object') {
			removePropertyFromObject(value, propName);
		}
	}
}

// describe('Oas20 to Raml10 Definition Test', () => {
// 	let oasDefinitions;
// 	let ramlDefinitions;
// 	const oasFilePath = __dirname + '/../../data2/definition/oas/oas.yaml';
// 	const ramlFilePath = __dirname + '/../../data2/definition/raml10/raml10.yaml';
//
//
// 	beforeEach(done =>  {
// 		const oasImporter = new Oas();
// 		const ramlImporter = new Raml();
// 		const oasPromise = oasImporter.loadFile(oasFilePath);
// 		oasPromise.then(() => {
// 			this.oasDefinitions = oasImporter.data.definitions;
// 			const ramlPromise = ramlImporter.loadFile(ramlFilePath);
// 			ramlPromise.then(() => {
// 				this.ramlDefinitions = ramlImporter.data.types;
// 				removePropertyFromObject(this.ramlDefinitions, 'typePropertyKind');
// 				removePropertyFromObject(this.ramlDefinitions, 'structuredExample');
// 				removePropertyFromObject(this.ramlDefinitions, 'fixedFacets');
// 				removePropertyFromObject(this.ramlDefinitions, 'name');
// 				return done();
// 			}).catch(err => {
// 				console.log(err);
// 				return done(err);
// 			});
// 		}).catch(err => {
// 			console.log(err);
// 			return done(err);
// 		});
// 	});
//
// 	it('should be able to convert a simple definition', done => {
//
// 		//pet
// 		const modelPet = Oas20Definition.import(this.oasDefinitions.pet);
// 		const ramlPet = Raml10Definition.export(modelPet);
// 		const ramlOriginalPet = this.ramlDefinitions[0].pet;
// 		expect(YAML.safeLoad(YAML.safeDump(ramlPet))).to.deep.equal(YAML.safeLoad(YAML.safeDump(ramlOriginalPet)));
//
// 		//dog
//  		const modelDog = Oas20Definition.import(this.oasDefinitions.dog);
// 		const ramlDog = Raml10Definition.export(modelDog);
// 		const ramlOriginalDog = this.ramlDefinitions[1].dog;
// 		expect(YAML.safeLoad(YAML.safeDump(ramlDog))).to.deep.equal(YAML.safeLoad(YAML.safeDump(ramlOriginalDog)));
//
// 		//cat
// 		const modelCat = Oas20Definition.import(this.oasDefinitions.cat);
// 		const ramlCat = Raml10Definition.export(modelCat);
// 		const ramlOriginalCat = this.ramlDefinitions[2].cat;
//
// 		const result = {};
// 		result.title = 'title';
// 		result.types = {};
//
// 		result.types['pet'] = ramlPet;
// 		result.types['dog'] = ramlDog;
// 		result.types['cat'] = ramlCat;
//
// 		//validate if oasData is valid.
// 		try {
// 			const importer = new Raml();
// 			const raml = '#%RAML 1.0\n' + YAML.safeDump(result);
// 			console.log(raml);
// 			const promise2 = importer.loadData(raml);
// 			promise2
// 				.then(() => {
// 					console.log(JSON.stringify(importer.data, null, 2));
// 					return done();
// 				})
// 				.catch(err => {
// 					return done(err);
// 				});
// 		} catch (e) {
// 			return done(e);
// 		}
// 	});
// });

describe ('Oas20 to Raml10 Definition Test', () => {

	const testWithData = function (sourceFile, targetFile) {
		return done => {
			const oasImporter = new Oas();
			const ramlImporter = new Raml();
			const oasPromise = oasImporter.loadFile(sourceFile);
			oasPromise.then(() => {
				try {
					this.oasDefinitions = oasImporter.data.definitions;
					if (_.isEmpty(this.oasDefinitions)) return done();

					const oas20DefinitionConverter = new Oas20DefinitionConverter();
					const raml10DefinitionConverter = new Raml10DefinitionConverter();
					const models = oas20DefinitionConverter.import(this.oasDefinitions)
					
					const result = {};
					result.types = raml10DefinitionConverter.export(models);
					
					expect(YAML.safeLoad(YAML.safeDump(result.types))).to.deep.equal(YAML.safeLoad(fs.readFileSync(targetFile, 'utf8')).types);

					//validate if ramlData is valid.
					// try {
					// 	const promise2 = ramlImporter.loadData('#%RAML 1.0\n' + YAML.safeDump(result));
					// 	promise2
					// 		.then(() => {
					// 			return done();
					// 		})
					// 		.catch(err => {
					// 			return done(err);
					// 		});
					// } catch (e) {
					// 	return done(e);
					// }
				} catch (e) {
					done(e);
				}
			}).catch(err => {
				done(err);
			});
		};
	};

	const baseDir = __dirname + '/../../lib/../data/swagger-import/swagger';
	const testFiles = fs.readdirSync(baseDir);

	testFiles.forEach(function (testFile) {
		if (!_.startsWith(testFile, '.')) {
			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../raml/' + _.replace(testFile, 'json', 'yaml');

			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile));
				}
			} else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile));
			}
		}
	});
});