const Oas = require('../../../lib/importers/swagger');
const Oas20SecurityDefinitionConverter = require('../../../lib/oas20/oas20SecurityDefinitionConverter');
const YAML = require('js-yaml');
const _ = require('lodash');
const fs = require('fs');

describe('from oas to model to oas', () => {
	const testWithData = sourceFile => {
		return done => {
			const importer = new Oas();
			const promise = importer.loadFile(sourceFile);
			promise.then(() => {
				try {
					const data = importer.data;

					const result = {};
					result.swagger = '2.0';
					result.info = {
						version: '1.0.0',
						title: 'title'
					};
					result.paths = {};
					result.securityDefinitions = {};
					const oas20SecurityDefinition = new Oas20SecurityDefinitionConverter();

					const models = oas20SecurityDefinition.import(data.securityDefinitions);
					result.securityDefinitions = oas20SecurityDefinition.export(models);

					//validate if oasData is valid.
					try {
						const promise2 = importer.loadData(JSON.stringify(result));
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

	const baseDir = __dirname + '/../../data2/securityDefinition/oas';
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
