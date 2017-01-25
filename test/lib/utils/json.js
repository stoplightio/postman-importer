const chai = require('chai'),
	expect = chai.expect,
	jsonHelper = require('../../../lib/utils/json');

chai.use(require('chai-fuzzy'));

describe('json utility library', function () {
	const sourceJson = {
		'foo': 'bar'
	};
	describe('parse', function () {
		it('should parse a valid json string to json object', function () {
			const parsedJSON = jsonHelper.parse(JSON.stringify(sourceJson));
			expect(parsedJSON).to.be.like(sourceJson);
		});
		it('should parse a valid json string that might got encoded multiple times', function () {
			const parsedJSON = jsonHelper.parse(JSON.stringify(JSON.stringify(sourceJson)));
			expect(parsedJSON).to.be.like(sourceJson);
		});
		it('should return invalid json string as it is, without throwing error', function () {
			const invalidJSON = 'Hello World';
			const parsedData = jsonHelper.parse(invalidJSON);
			expect(parsedData).to.be.equal(invalidJSON);
		});
	});
	
	describe('stringify', function () {
		it('should stringify a json object', function () {
			const resultString = jsonHelper.stringify(sourceJson);
			expect(resultString).to.equal(JSON.stringify(sourceJson));
		});
		it('should stringify a json object with spacing if given', function () {
			const resultString = jsonHelper.stringify(sourceJson, 4);
			expect(resultString).to.equal(JSON.stringify(sourceJson, null, 4));
		});
		it('should return as it is if already a string', function () {
			const sourceString = JSON.stringify(sourceJson);
			const resultString = jsonHelper.stringify(sourceString);
			expect(resultString).to.equal(sourceString);
		});
	});
	
	describe('format', function () {
		it('should format a given json object into a pretty print styled json string', function () {
			const resultString = jsonHelper.format(sourceJson);
			expect(resultString).to.equal(JSON.stringify(sourceJson, null, 4));
		});
		it('should format a given json string into a pretty printed json string', function () {
			const resultString = jsonHelper.format(JSON.stringify(sourceJson));
			expect(resultString).to.equal(JSON.stringify(sourceJson, null, 4));
		});
		it('should return as it is for invalid json string', function () {
			const invalidJSON = 'Hello World';
			const resultString = jsonHelper.format(invalidJSON);
			expect(resultString).to.equal(invalidJSON);
		});
	});
	
});
