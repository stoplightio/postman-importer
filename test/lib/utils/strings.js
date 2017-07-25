const describe = require('mocha/lib/mocha.js').describe;
const expect = require('chai').expect;

const stringsHelper = require('../../../src/utils/strings');

describe('strings utility library', function () {
	describe('computeOperationId', function () {
		it('should handle root url', function () {
			const id = stringsHelper.computeOperationId('GET', '/');
			expect(id).to.be.equal('GET_root');
		});
		it('should handle root url', function () {
			const id = stringsHelper.computeOperationId('GET', '');
			expect(id).to.be.equal('GET_root');
		});
		it('should handle dynamic params', function () {
			const id = stringsHelper.computeOperationId('GET', '/foo/{bar}');
			expect(id).to.be.equal('GET_foo-bar');
		});
		it('should handle periods', function () {
			const id = stringsHelper.computeOperationId('GET', '/foo/bar.json');
			expect(id).to.be.equal('GET_foo-bar-json');
		});
		it('should handle basic url', function () {
			const id = stringsHelper.computeOperationId('GET', '/foo/bar');
			expect(id).to.be.equal('GET_foo-bar');
		});
	});
});
