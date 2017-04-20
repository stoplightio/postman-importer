const expect = require('chai').expect;
const beforeEach = require("mocha/lib/mocha.js").beforeEach;
const Oas = require('../../../lib/importers/swagger');
const Oas20DefinitionConverter = require('../../../lib/oas20/Oas20DefinitionConverter');
const YAML = require('js-yaml');
const fs = require('fs');
const _ = require('lodash');
const jsonHelper = require('../../../lib/utils/json');

describe('Oas Definition Test', () => {

	it('should be able to convert a simple definition', done => {

		const filePath = __dirname + '/../../data2/definition/oas/oas.yaml';
		const importer = new Oas();
		const promise = importer.loadFile(filePath);
		promise.then(() => {
			const data = importer.data;

			//import
			const oas20Definitions = new Oas20DefinitionConverter();
			const models = oas20Definitions.import(data.definitions);

			const modelPet = models.pet;
			expect(modelPet.type).to.be.equal('string');
			expect(modelPet.reference).to.be.empty;
			expect(modelPet.properties).to.be.empty;

			const modelDog = models.dog;
			expect(modelDog.type).to.be.empty;
			expect(modelDog.reference).to.be.equal('pet');
			expect(modelDog.properties).to.be.empty;

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

			//export

			const defs = oas20Definitions.export(models);
			expect(YAML.safeLoad(YAML.safeDump(defs))).to.deep.equal(YAML.safeLoad(YAML.safeDump(data.definitions)));

			return done();
		}).catch(err => {
			console.log(err);
			return done(err);
		});


	});
});

describe('from oas to model to oas', () => {
	const testWithData = sourceFile => {
		return done => {
			const importer = new Oas();
			const promise = importer.loadFile(sourceFile);
			promise.then(() => {
				try {
					const data = importer.data;

					if (_.isEmpty(data.definitions)) return done();

					const result = {};
					result.swagger = '2.0';
					result.info = {
						version: '1.0.0',
						title: 'title'
					};
					result.paths = {};
					result.definitions = {};
					const oas20Definition = new Oas20DefinitionConverter();

					const models = oas20Definition.import(data.definitions);
					result.definitions = oas20Definition.export(models);

					// expect(YAML.safeLoad(YAML.safeDump(result.definitions))).to.deep.equal(YAML.safeLoad(YAML.safeDump(data.definitions)));
					expect(YAML.safeLoad(YAML.dump(jsonHelper.parse(JSON.stringify(result.definitions))))).to.deep.equal(YAML.safeLoad(YAML.dump(jsonHelper.parse(JSON.stringify(data.definitions)))));
					return done();
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

	const baseDir = __dirname + '/../../data/swagger-import/swagger';
	const testFiles = fs.readdirSync(baseDir);
	testFiles.forEach(testFile => {
		if (!_.startsWith(testFile, '.')) {

			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(baseDir + '/' + testFile))
				}
			} else {
				it('test: ' + testFile, testWithData(baseDir + '/' + testFile))
			}
		}
	});
});