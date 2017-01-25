const expect = require('chai').expect,
	Importer = require('../../../lib/importers/importer');

describe('Importer', function () {
	let importer;
	const filePath = __dirname + '/../../data/stoplight.json';
	beforeEach(function () {
		importer = new Importer();
	});
	
	describe('constructor', function () {
		it('should create new importer instance successfully', function () {
			expect(importer).to.be.instanceof(Importer);
		});
	});
	describe('loadFile', function () {
		it('should have unimplemented method that corresponding importer will implement', function () {
			try {
				importer.loadFile(filePath);
				expect(true).to.be.false;
			}
			catch (err) {
				expect(err).to.be.instanceof(Error);
				expect(err.message).to.equal('loadFile method not implemented');
			}
		});
	});
	describe('loadData', function () {
		it('should be able to load data directly', function (done) {
			importer.loadData(require(filePath))
				.then(() => {
					done();
				})
				.catch(done);
		});
	});
	describe('_import', function () {
		it('should have  unimplemented _import method, throw error upon called', function () {
			try {
				importer.data = require(filePath);
				importer._import();
				expect(true).to.be.false;
			}
			catch (err) {
				expect(err).to.be.instanceof(Error);
				expect(err.message).to.equal('_import method not implemented');
			}
		});
	});
	describe('import', function () {
		beforeEach(function () {
			importer._import = function () {
				//
			};
		});
		it('should have data loaded flag true if data loaded', function () {
			importer.data = require(filePath);
			expect(importer.IsDataLoaded).to.be.true;
		});
		it('should have data loaded flag false if data not loaded', function () {
			expect(importer.IsDataLoaded).to.be.false;
		});
		it('should return error if data not loaded', function () {
			try {
				importer.import();
				expect(true).to.be.false;
			}
			catch (err) {
				expect(err).to.be.instanceof(Error);
				expect(err.message).to.equal('data not loaded for Importer');
			}
		});
		it('should set mapped flag so that multiple call doesn\'t cause all calculation over again', function () {
			importer.data = require(filePath);
			expect(importer.Mapped).to.be.false;
			importer.import();
			expect(importer.Mapped).to.be.true;
		});
	});
	
	describe('_mapEndpoint', function () {
		it('should throw error if method called, but not implemented by child', function () {
			expect(importer._mapEndpoint).to.throw(Error);
		});
	});
	
	describe('_mapSchema', function () {
		it('should throw error if method called, but not implemented by child', function () {
			expect(importer._mapSchema).to.throw(Error);
		});
	});
	
	describe('_mapQueryString', function () {
		it('should throw error if method called, but not implemented by child', function () {
			expect(importer._mapQueryString).to.throw(Error);
		});
	});
	
	describe('_mapURIParams', function () {
		it('should throw error if method called, but not implemented by child', function () {
			expect(importer._mapURIParams).to.throw(Error);
		});
	});
	
	describe('_mapRequestBody', function () {
		it('should throw error if method called, but not implemented by child', function () {
			expect(importer._mapRequestBody).to.throw(Error);
		});
	});
	
	describe('_mapResponseBody', function () {
		it('should throw error if method called, but not implemented by child', function () {
			expect(importer._mapResponseBody).to.throw(Error);
		});
	});
	
	describe('_mapRequestHeaders', function () {
		it('should throw error if method called, but not implemented by child', function () {
			expect(importer._mapRequestHeaders).to.throw(Error);
		});
	});
});
