const chai = require('chai'),
	expect = chai.expect,
	stringsHelper = require('../../../lib/utils/strings');
import {describe, it} from "mocha";

describe('strings utility library', function () {
	describe('computeOperationId', function () {
		it('should handle root url', function () {
			let id = stringsHelper.computeOperationId('GET', '/');
			expect(id).to.be.equal('GET_root');
		});
		it('should handle root url', function () {
			let id = stringsHelper.computeOperationId('GET', '');
			expect(id).to.be.equal('GET_root');
		});
		it('should handle dynamic params', function () {
			let id = stringsHelper.computeOperationId('GET', '/foo/{bar}');
			expect(id).to.be.equal('GET_foo-bar');
		});
		it('should handle periods', function () {
			let id = stringsHelper.computeOperationId('GET', '/foo/bar.json');
			expect(id).to.be.equal('GET_foo-bar-json');
		});
		it('should handle basic url', function () {
			let id = stringsHelper.computeOperationId('GET', '/foo/bar');
			expect(id).to.be.equal('GET_foo-bar');
		});
	});
});
