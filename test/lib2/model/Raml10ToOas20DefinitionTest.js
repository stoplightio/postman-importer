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
const jsonHelper = require('../../../lib/utils/json');

describe ('Raml10 to Oas20 Definition Test', () => {

	const testWithData = function (sourceFile, targetFile, stringCompare) {
		return done => {
			const ramlImporter = new Raml();
			const ramlPromise = ramlImporter.loadFile(sourceFile);
			ramlPromise.then(() => {
				if (_.isEmpty(ramlImporter.data)) return done()

				try {
					const ramlTypes = ramlImporter.data.types;
					if (_.isEmpty(ramlTypes)) return done();

					const oas20DefinitionConverter = new Oas20DefinitionConverter();
					const raml10DefinitionConverter = new Raml10DefinitionConverter('oas');
					const models = raml10DefinitionConverter.import(ramlTypes)

					const result = {};
					result.definitions = oas20DefinitionConverter.export(models);

					// expect(YAML.safeLoad(YAML.safeDump(result.types))).to.deep.equal(YAML.safeLoad(fs.readFileSync(targetFile, 'utf8')).types);
					expect(YAML.safeLoad(YAML.dump(jsonHelper.parse(JSON.stringify(result.definitions))))).to.deep.equal(YAML.safeLoad(fs.readFileSync(targetFile, 'utf8')).definitions);
					done();
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

	const baseDir = __dirname + '/../../data/raml-import/raml';
	const testFiles = fs.readdirSync(baseDir);

	testFiles.forEach(function (testFile) {
		if (!_.startsWith(testFile, '.')) {
			const stringCompare = _.includes(testFile, 'stringcompare');
			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../swagger/' + testFile;

			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile, stringCompare));
				}
			} else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile, stringCompare));
			}
		}
	});
});