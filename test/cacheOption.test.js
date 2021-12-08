/*jshint expr:true */
'use strict';

var Spider = require('../lib/taispider');
const { Request } = require('../lib/http/request');
var expect = require('chai').expect;
var nock = require('nock');
// var sinon = require('sinon');
var httpTarget = 'http://target.com';
var c;
var scope;

describe('Cache features tests', function () {
	describe('Skip Duplicate active', function () {
		beforeEach(function () {
			scope = nock(httpTarget);
		});
		afterEach(function () {
			c = {};
		});

		it('should not skip one single url', function (done) {
			var call = scope.get('/').reply(200);
			c = new Spider({
				pipelines: []
			});

			c.queue([{
				skipDuplicates: false,
				request: new Request({ link: httpTarget }),
				callback: function (error, result, cb) {
					cb();
					expect(error).to.be.null;
					expect(result.statusCode).to.equal(200);
					expect(call.isDone()).to.be.true;
					done();
					return [];
				},
			}]);
		});

		it('should notify the callback when an error occurs and "retries" is disabled', function (done) {
			var koScope = scope.get('/').replyWithError('too bad');
			c = new Spider({
				skipDuplicates: true,
				retries: 0,
			});

			c.queue([{
				request: new Request({ link: httpTarget }),
				callback: function (error, result, cb) {
					cb();
					expect(error).to.exist;
					expect(koScope.isDone()).to.be.true;
					done();
					return [];
				},
			}]);
		});

		it('should retry and notify the callback when an error occurs and "retries" is enabled', function (done) {
			var koScope = scope.get('/').replyWithError('too bad').persist();

			c = new Spider({
				skipDuplicates: true,
				retries: 1,
				retryTimeout: 10,
			});

			c.queue([{
				request: new Request({ link: httpTarget }),
				callback: function (error, result, cb) {
					cb();
					expect(error).to.exist;
					expect(koScope.isDone()).to.be.true;
					scope.persist(false);
					done();
					return [];
				},
			}]);
		});

		//it('should skip previous crawled urls', function (done) {});
	});
});

