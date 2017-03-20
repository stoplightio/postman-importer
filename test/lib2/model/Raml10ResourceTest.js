const expect = require('chai').expect;
const beforeEach = require('mocha/lib/mocha.js').beforeEach;
const Raml10ResourceConverter = require('../../../lib/raml10/Raml10ResourceConverter');
const YAML = require('js-yaml');
const Raml = require('../../../lib/importers/baseraml');
const _ = require('lodash');
const fs = require('fs');

describe.skip('from raml to model to raml', () => {
	const testWithData = sourceFile => {
		return done => {
			const importer = new Raml();
			const promise = importer.loadFile(sourceFile);
			promise.then(() => {
				try {
					const data = importer.data;
					const result = {};
					
					result.title = 'title';
					const raml10ResourceConverter = new Raml10ResourceConverter();

					const models = raml10ResourceConverter.import(data.resources);
					const exportedModels = raml10ResourceConverter.export(models);
					Object.keys(exportedModels).map(key => {
						result[key] = exportedModels[key];
					});
					
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
	
	const baseDir = __dirname + '/../../data2/resource/raml10';
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