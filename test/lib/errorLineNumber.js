const fs = require('fs');
const it = require('mocha/lib/mocha.js').it;
const describe = require('mocha/lib/mocha.js').describe;
const RamlErrorLineNumber = require('../../src/helpers/ramlErrorLineNumber');
const expect = require('chai').expect;

describe('Raml10 to line number ', () => {
	const baseDir = __dirname + '/../data/errorLineNumber/raml';
	const testFiles = fs.readdirSync(baseDir);

	const testWithData = (sourceFile, targetFile) => {
		return done => {
			const fileContent = fs.readFileSync(sourceFile, 'utf8');
			const modelPath = fs.readFileSync(sourceFile.replace('.yaml', '.path'), 'utf8').trim();
			const ramlErrorLineNumber = new RamlErrorLineNumber(fileContent, modelPath);
			const lineNumber = ramlErrorLineNumber.getLineNumber();
			expect(lineNumber).to.be.equal(parseInt(fs.readFileSync(targetFile, 'utf8').trim()));

			return done();
		};
	};

	testFiles.forEach(testFile => {
		if (!testFile.startsWith('.') && testFile.endsWith('yaml')) {
			const sourceFile = baseDir + '/' + testFile;
			const targetFile = (baseDir + '/../lineNumber/' + testFile).replace('.yaml', '.txt');

			if (process.env.testFile) {
				if (testFile.endsWith(process.env.testFile)) {
					it('test: ' + testFile, testWithData(sourceFile, targetFile));
				}
			} else {
				it('test: ' + testFile, testWithData(sourceFile, targetFile));
			}
		}
	});
});
