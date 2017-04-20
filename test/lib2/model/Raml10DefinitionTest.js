const expect = require('chai').expect;
const beforeEach = require('mocha/lib/mocha.js').beforeEach;
const Raml10DefinitionConverter = require('../../../lib/raml10/Raml10DefinitionConverter');
const YAML = require('js-yaml');
const Raml = require('../../../lib/importers/baseraml');
const _ = require('lodash');
const fs = require('fs');


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

describe('Raml10 Definition Test', () => {
	const filePath = __dirname + '/../../data2/definition/raml10/raml10.yaml';

	it('should be able to convert a simple definition', done => {

		const importer = new Raml();
		const promise = importer.loadFile(filePath);
		promise.then(() => {
			const data = importer.data;
			removePropertyFromObject(this.data, 'typePropertyKind');

			//import
			const originalPet = data.types[0].pet;
			const originalDog = data.types[1].dog;
			const originalCat = data.types[2].cat;

			const raml10DefinitionConverter = new Raml10DefinitionConverter();
			const models = raml10DefinitionConverter.import(data.types);
			const modelPet = models.pet;
			expect(modelPet.type).to.be.equal('string');
			expect(modelPet.reference).to.be.empty;

			const modelDog = models.dog;
			expect(modelDog.type).to.be.empty;
			expect(modelDog.reference).to.be.equal('pet');

			const modelCat = models.cat;
			expect(modelCat.reference).to.be.empty;
			expect(modelCat.type).to.be.equal('object');
			expect(modelCat.properties).not.to.be.empty;
			expect(modelCat.properties.a.type).to.be.equal('string');
			expect(modelCat.properties.a.reference).to.be.empty;
			expect(modelCat.properties.b.type).to.be.empty;
			expect(modelCat.properties.b.reference).to.be.equal('dog');
			expect(modelCat.propsRequired).not.to.be.empty;
			expect(modelCat.propsRequired[0]).to.be.equals('a');

			return done();
		}).catch(err => {
			console.log(err);
			return done(err);
		});
	});
});

describe('from raml to model to raml', () => {
	const testWithData = sourceFile => {
		return done => {
			const importer = new Raml();
			const promise = importer.loadFile(sourceFile);
			promise.then(() => {
				try {
					const data = importer.data;
					const result = {};
					removePropertyFromObject(data, 'typePropertyKind');
					removePropertyFromObject(data, 'structuredExample');
					removePropertyFromObject(data, 'fixedFacets');

					result.types = {};
					const raml10DefinitionConverter = new Raml10DefinitionConverter();

					const models = raml10DefinitionConverter.import(data.types)
					result.types = raml10DefinitionConverter.export(models);

					// expect(YAML.safeLoad(YAML.safeDump(result.types))).to.deep.equal(YAML.safeLoad(fs.readFileSync(sourceFile, 'utf8')).types);

					//validate if ramlData is valid.
					try {
						const promise2 = importer.loadData('#%RAML 1.0\n' + YAML.safeDump(result));
						promise2
							.then(() => {
								return done();
							})
							.catch(err => {
								return done(err);
							});
					} catch (e) {
						return done(e);
					}
				}
				catch (e) {
					return done(e);
				}
			})
				.catch(err => {
					return done(err);
				});
		};
	};

	const baseDir = __dirname + '/../../data/raml-import/raml';
	const testFiles = fs.readdirSync(baseDir);
	testFiles.forEach(testFile => {
		if (!_.startsWith(testFile, '.')) {
			const skip = _.includes(testFile, 'skip');
			if (skip) return;
			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(baseDir + '/' + testFile)).timeout(100000)
				}
			} else {
				it('test: ' + testFile, testWithData(baseDir + '/' + testFile)).timeout(100000)
			}
		}
	});
});