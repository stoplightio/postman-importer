const fs = require('fs');
const chai = require('chai');
const	expect = chai.expect;
const	specConverter = require('../../src/index');
const	YAML = require('js-yaml');
const	_ = require('lodash');
const it = require('mocha/lib/mocha.js').it;
const describe = require('mocha/lib/mocha.js').describe;

chai.use(require('chai-string'));

describe('Raml10 to Model errors', () => {
	const baseDir = __dirname + '/../data/modelErrors/raml';
	const testFiles = fs.readdirSync(baseDir);
	const converter = new specConverter.Converter(specConverter.Formats.RAML, specConverter.Formats.RAML, true);

	const testWithData = function (sourceFile, targetFile) {
		const validateOptions = {
			format: 'yaml'
		};

		return function (done) {
			converter.getModelFromFile(sourceFile, validateOptions)
			.then(model => {
				try {
					const notExistsTarget = !fs.existsSync(targetFile);
					if (notExistsTarget) {
						console.log('Content for non existing target file ' + targetFile + '\n.');
						console.log('********** Begin file **********\n');
						console.log(model);
						console.log('********** Finish file **********\n');
						return done(model);
					} else {
						const formattedData = typeof model === 'object' ? YAML.dump(model) : model;
						expect(YAML.safeLoad(formattedData)).to.deep.equal(YAML.safeLoad(fs.readFileSync(targetFile, 'utf8')));
						done();
					}
				} catch (e) {
					done(e);
				}
			}).catch((err) => {
				console.error('error exporting file.');
				done(err);
			});
		};
	};

	testFiles.forEach(function (testFile) {
		if (!_.startsWith(testFile, '.')) {
			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../model/' + testFile;

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
