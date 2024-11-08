/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const proxyquire = require('proxyquire').noCallThru();

const Test = require('../../lib/test');
const ramlParserStub = require('raml2obj');
const addTestsStub = require('../../lib/add-tests');
const addHooksStub = require('../../lib/add-hooks');
const runnerStub = require('../../lib/test-runner');
const hooksStub = require('../../lib/hooks');

const Abao = proxyquire('../../', {
  'raml2obj': ramlParserStub,
  './add-tests': addTestsStub,
  './add-hooks': addHooksStub,
  './test-runner': runnerStub,
  './hooks': hooksStub
});

const should = chai.should();
chai.use(sinonChai);


describe('Abao', function() {
  'use strict';

  describe('#constructor', () => describe('with default config', () => it('should create a new instance', function() {
    const abao = new Abao();
    return abao.should.not.be.null;
  })));


  return describe('#run', function() {

    let abao = '';
    let callback = undefined;
    before(function(done) {
      abao = new Abao();
      callback = sinon.stub();
      callback.returns(done());
      return abao.run(callback);
    });

    return it('should invoke callback', () => callback.should.be.called);
  });
});

