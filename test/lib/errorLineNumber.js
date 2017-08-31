const fs = require('fs');
const	_ = require('lodash');
const it = require('mocha/lib/mocha.js').it;
const describe = require('mocha/lib/mocha.js').describe;
const RamlErrorLineNumber = require('../../src/helpers/ramlErrorLineNumber');

const chai = require('chai');
const	expect = chai.expect;
// const	specConverter = require('../../src/index');
// const	YAML = require('js-yaml');
// chai.use(require('chai-string'));

describe('Raml10 to line number ', () => {
	const baseDir = __dirname + '/../data/errorLineNumber/raml';
	const testFiles = fs.readdirSync(baseDir);

	const testWithData = (sourceFile, targetFile) => {
		return done => {
			const fileContent = fs.readFileSync(sourceFile, 'utf8');
			const modelPath = _.trim(fs.readFileSync(sourceFile.replace('.yaml', '.path'), 'utf8'));
			const ramlErrorLineNumber = new RamlErrorLineNumber(fileContent, modelPath);
			const lineNumber = ramlErrorLineNumber.getLineNumber();
			expect(lineNumber).to.be.equal(_.toInteger(_.trim(fs.readFileSync(targetFile, 'utf8'))));

			return done();
		};
	};

	testFiles.forEach(testFile => {
		if (!_.startsWith(testFile, '.') && _.endsWith(testFile, 'yaml')) {
			const sourceFile = baseDir + '/' + testFile;
			const targetFile = baseDir + '/../lineNumber/' + testFile;

			if (process.env.testFile) {
				if (_.endsWith(testFile, process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile.replace('.yaml', '.txt')));
				}
			} else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile.replace('.yaml', '.txt')));
			}
		}
	});
});
