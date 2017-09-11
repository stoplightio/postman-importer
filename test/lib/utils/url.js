const describe = require('mocha/lib/mocha.js').describe;
const expect = require('chai').expect;

const urlHelper = require('../../../src/utils/url');

describe('url utility library', function () {
	describe('parse url', function () {
		it('should parse common url', function () {
			const url = urlHelper.parseURL('http://www.gmail.com/mail');
			expect(url.protocol).to.be.equal('http');
			expect(url.host).to.be.equal('www.gmail.com');
			expect(url.pathname).to.be.equal('/mail');
		});

		it('should parse https', function () {
			const url = urlHelper.parseURL('https://www.gmail.com/mail');
			expect(url.protocol).to.be.equal('https');
			expect(url.host).to.be.equal('www.gmail.com');
			expect(url.pathname).to.be.equal('/mail');
		});

		it('should parse many paths', function () {
			const url = urlHelper.parseURL('https://www.gmail.com/mail/mail2/mail3');
			expect(url.protocol).to.be.equal('https');
			expect(url.host).to.be.equal('www.gmail.com');
			expect(url.pathname).to.be.equal('/mail/mail2/mail3');
		});

		it('should parse empty path', function () {
			const url = urlHelper.parseURL('https://www.gmail.com/');
			expect(url.protocol).to.be.equal('https');
			expect(url.host).to.be.equal('www.gmail.com');
			expect(url.pathname).to.be.equal('/');
		});

		it('should parse no path', function () {
			const url = urlHelper.parseURL('https://www.gmail.com');
			expect(url.protocol).to.be.equal('https');
			expect(url.host).to.be.equal('www.gmail.com');
			expect(url.pathname).to.be.equal('');
		});

		it('should parse no protocol many paths', function () {
			const url = urlHelper.parseURL('www.gmail.com/mail/mail2/mail3');
			expect(url.protocol).to.be.equal('http');
			expect(url.host).to.be.equal('www.gmail.com');
			expect(url.pathname).to.be.equal('/mail/mail2/mail3');
		});

		it('should parse no protocol one path', function () {
			const url = urlHelper.parseURL('www.gmail.com/mail');
			expect(url.protocol).to.be.equal('http');
			expect(url.host).to.be.equal('www.gmail.com');
			expect(url.pathname).to.be.equal('/mail');
		});

		it('should parse no protocol empty path', function () {
			const url = urlHelper.parseURL('www.gmail.com/');
			expect(url.protocol).to.be.equal('http');
			expect(url.host).to.be.equal('www.gmail.com');
			expect(url.pathname).to.be.equal('/');
		});

		it('should parse no protocol no path', function () {
			const url = urlHelper.parseURL('www.gmail.com');
			expect(url.protocol).to.be.equal('http');
			expect(url.host).to.be.equal('www.gmail.com');
			expect(url.pathname).to.be.equal('');
		});

		it('should parse protocol no host no path', function () {
			const url = urlHelper.parseURL('https://');
			expect(url.protocol).to.be.equal('https');
			expect(url.host).to.be.equal('');
			expect(url.pathname).to.be.equal('');
		});

		it('should parse url defined using variables', function () {
			const url = urlHelper.parseURL('{protocol}://{domain}/rest/api/{version}');
			expect(url.protocol).to.be.equal('http');
			expect(url.host).to.be.equal('{domain}');
			expect(url.pathname).to.be.equal('/rest/api/{version}');
		});

		it('should parse url defined using variables with port', function () {
			const url = urlHelper.parseURL('{protocol}://{domain}:{port}/rest/api/{version}');
			expect(url.protocol).to.be.equal('http');
			expect(url.host).to.be.equal('{domain}:{port}');
			expect(url.pathname).to.be.equal('/rest/api/{version}');
		});
		
	});
});
