const it = require('mocha/lib/mocha.js').it;
const describe = require('mocha/lib/mocha.js').describe;
const beforeEach = require('mocha/lib/mocha.js').beforeEach;
const expect = require('chai').expect;

const	Exporter = require('../../../src/exporters/exporter');

describe.skip('Exporter', function () {
	let exporter;
	beforeEach(function () {
		exporter = new Exporter();
	});
	
	describe('constructor', function () {
		it('should create new exporter instance successfully', function () {
			expect(exporter).to.be.instanceof(Exporter);
		});
	});
	describe('loadSLData', function () {
		it('should return error for invalid formatted data');
	});
	describe('loadProject', function () {
		it('should load an spec-converter project entity');
	});
	describe('_export', function () {
		it('should have  unimplemented _export method, throw error upon called', function () {
			try {
				exporter._export();
				expect(true).to.equal(false);
			}
			catch (err) {
				expect(err).to.not.equal(null);
			}
		});
	});
	describe('export', function () {
		let dummyData;
		beforeEach(function () {
			exporter._export = function () {
				//
			};
			dummyData = {
				test: 'hello'
			};
			exporter.data = dummyData;
		});
		
		it('should perform export and return raw data with given format', function (done) {
			exporter.export('json').then((exportedData) => {
				expect(exportedData).to.equal(dummyData);
				done();
			}).catch((err) => {
				done(err);
			});
		});
		it('should return error if format not supported');
	});
	
	describe('_getData', function () {
		it('should return data with given format');
		it('should return default as formatted data if format not given');
	});
	describe('Data getter', function () {
		it('should escape apostrophe char', function () {
			exporter.data = 'srtring with’ apostrophe';
			expect(exporter.Data).to.equal('srtring with’ apostrophe');
		});
	});
	
	describe('_mapEndpoint', function () {
		it('should throw error if method called, but not implemented by child', function () {
			expect(exporter._mapEndpoint).to.throw(Error);
		});
	});
	
	describe('_mapSchema', function () {
		it('should throw error if method called, but not implemented by child', function () {
			expect(exporter._mapSchema).to.throw(Error);
		});
	});
	
	describe('_mapQueryString', function () {
		it('should throw error if method called, but not implemented by child', function () {
			expect(exporter._mapQueryString).to.throw(Error);
		});
	});
	
	describe('_mapURIParams', function () {
		it('should throw error if method called, but not implemented by child', function () {
			expect(exporter._mapURIParams).to.throw(Error);
		});
	});
	
	describe('_mapRequestBody', function () {
		it('should throw error if method called, but not implemented by child', function () {
			expect(exporter._mapRequestBody).to.throw(Error);
		});
	});
	
	describe('_mapResponseBody', function () {
		it('should throw error if method called, but not implemented by child', function () {
			expect(exporter._mapResponseBody).to.throw(Error);
		});
	});
	
	describe('_mapRequestHeaders', function () {
		it('should throw error if method called, but not implemented by child', function () {
			expect(exporter._mapRequestHeaders).to.throw(Error);
		});
	});
});
