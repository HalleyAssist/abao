/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const chai = require('chai');
const _ = require('lodash');
const mocha = require('mocha');
const mute = require('mute');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const {
  assert
} = chai;
const {
  expect
} = chai;
const should = chai.should();
chai.use(sinonChai);

const pkg = require('../../package');
const TestFactory = require('../../lib/test');
const hooksStub = require('../../lib/hooks');
let suiteStub = undefined;

const TestRunner = proxyquire('../../lib/test-runner', {
  'mocha': mocha,
  'hooks': hooksStub
});

const ABAO_IO_SERVER = 'http://abao.io';
const SERVER = 'http://localhost:3000';


describe('Test Runner', function() {
  'use strict';

  let runner = undefined;
  let test = undefined;

  const createStdTest = function() {
    const testname = 'GET /machines -> 200';
    const testFactory = new TestFactory();
    const stdTest = testFactory.create(testname, undefined);
    stdTest.request.path = '/machines';
    stdTest.request.method = 'GET';
    return stdTest;
  };


  describe('#run', function() {

    describe('when test is valid', function() {

      let beforeAllHook = undefined;
      let afterAllHook = undefined;
      let beforeHook = undefined;
      let afterHook = undefined;
      let runCallback = undefined;

      before(function(done) {
        test = createStdTest();
        test.response.status = 200;
        test.response.schema = `[
  type: 'string'
  name: 'string'
]`;

        const options =
          {server: `${ABAO_IO_SERVER}`};

        runner = new TestRunner(options, '');

        runCallback = sinon.stub();
        runCallback(done);
        runCallback.yield();

        beforeAllHook = sinon.stub();
        beforeAllHook.callsArg(0);
        afterAllHook = sinon.stub();
        afterAllHook.callsArg(0);

        hooksStub.beforeAllHooks = [beforeAllHook];
        hooksStub.afterAllHooks = [afterAllHook];

        beforeHook = sinon.stub();
        beforeHook.callsArg(1);
        hooksStub.beforeHooks[test.name] = beforeHook;

        const mochaStub = runner.mocha;
        const originSuiteCreate = mocha.Suite.create;
        sinon.stub(mocha.Suite, 'create')
          .callsFake(function(parent, title) {
            suiteStub = originSuiteCreate.call(mocha.Suite, parent, title);

            // Stub suite
            const originSuiteBeforeAll = suiteStub.beforeAll;
            const originSuiteAfterAll = suiteStub.afterAll;
            sinon.stub(suiteStub, 'beforeAll')
              .callsFake(function(title, fn) {
                beforeHook = fn;
                return originSuiteBeforeAll.call(suiteStub, title, fn);
            });
            sinon.stub(suiteStub, 'afterAll')
              .callsFake(function(title, fn) {
                afterHook = fn;
                return originSuiteAfterAll.call(suiteStub, title, fn);
            });

            return suiteStub;
        });

        sinon.stub(mochaStub, 'run')
          .callsFake(callback => callback(0));

        sinon.spy(mochaStub.suite, 'beforeAll');
        sinon.spy(mochaStub.suite, 'afterAll');

        sinon.stub(hooksStub, 'runBefore')
          .callsFake((test, callback) => callback());
        sinon.stub(hooksStub, 'runAfter')
          .callsFake((test, callback) => callback());

        return runner.run([test], hooksStub, runCallback);
      });

      after(function() {
        hooksStub.beforeAllHooks = [beforeAllHook];
        hooksStub.afterAllHooks = [afterAllHook];

        const mochaStub = runner.mocha;
        mochaStub.run.restore();
        mocha.Suite.create.restore();

        hooksStub.runBefore.restore();
        hooksStub.runAfter.restore();

        runCallback = undefined;
        runner = undefined;
        return test = undefined;
      });

      it('should generate beforeAll hooks', function() {
        const mochaStub = runner.mocha;
        assert.ok(mochaStub.suite.beforeAll.called);
        return assert.ok(mochaStub.suite.afterAll.called);
      });

      it('should run mocha', () => assert.ok(runner.mocha.run.calledOnce));

      it('should invoke callback with failures', () => runCallback.should.be.calledWith(null, 0));

      it('should generate mocha suite', function() {
        const {
          suites
        } = runner.mocha.suite;
        assert.equal(suites.length, 1);
        return assert.equal(suites[0].title, 'GET /machines -> 200');
      });

      it('should generate mocha test', function() {
        const {
          tests
        } = runner.mocha.suite.suites[0];
        assert.equal(tests.length, 1);
        return assert.notOk(tests[0].pending);
      });

      return it('should generate hook of suite', function() {
        assert.ok(suiteStub.beforeAll.called);
        return assert.ok(suiteStub.afterAll.called);
      });
    });

      // describe 'when executed hooks', () ->
      //   before (done) ->
      //
      //   it 'should execute hooks', () ->
      //   # it 'should generate before hook', () ->
      //     assert.ok hooksStub.runBefore.calledWith(test)
        //
        // it 'should call after hook', () ->
        //   assert.ok hooksStub.runAfter.calledWith(test)


    describe('Interact with #test', function() {

      before(function(done) {
        test = createStdTest();
        test.response.status = 200;
        test.response.schema = `[
  type: 'string'
  name: 'string'
]`;

        const options =
          {server: `${ABAO_IO_SERVER}`};

        runner = new TestRunner(options, '');
        sinon.stub(test, 'run')
          .callsFake(callback => callback());

        // Mute stdout/stderr
        return mute(unmute => runner.run([test], hooksStub, function() {
          unmute();
          return done();
        }));
      });

      after(function() {
        test.run.restore();
        runner = undefined;
        return test = undefined;
      });

      return it('should call #test.run', () => assert.ok(test.run.calledOnce));
    });


    describe('when test has no response code', function() {

      before(function(done) {
        const testFactory = new TestFactory();
        test = testFactory.create();
        test.name = 'GET /machines -> 200';
        test.request.path = '/machines';
        test.request.method = 'GET';

        const options =
          {server: `${SERVER}`};

        runner = new TestRunner(options, '');
        sinon.stub(runner.mocha, 'run')
          .callsFake(callback => callback());
        sinon.stub(test, 'run')
          .callsFake(callback => callback());

        return runner.run([test], hooksStub, done);
      });

      after(function() {
        runner.mocha.run.restore();
        runner = undefined;
        return test = undefined;
      });

      it('should run mocha', () => assert.ok(runner.mocha.run.called));

      it('should generate mocha suite', function() {
        const {
          suites
        } = runner.mocha.suite;
        assert.equal(suites.length, 1);
        return assert.equal(suites[0].title, 'GET /machines -> 200');
      });

      return it('should generate pending mocha test', function() {
        const {
          tests
        } = runner.mocha.suite.suites[0];
        assert.equal(tests.length, 1);
        return assert.ok(tests[0].pending);
      });
    });


    describe('when test skipped in hooks', function() {

      before(function(done) {
        test = createStdTest();
        test.response.status = 200;
        test.response.schema = `[
  type: 'string'
  name: 'string'
]`;

        const options =
          {server: `${SERVER}`};

        runner = new TestRunner(options, '');
        sinon.stub(runner.mocha, 'run')
          .callsFake(callback => callback());
        sinon.stub(test, 'run')
          .callsFake(callback => callback());
        hooksStub.skippedTests = [test.name];
        return runner.run([test], hooksStub, done);
      });

      after(function() {
        hooksStub.skippedTests = [];
        runner.mocha.run.restore();
        runner = undefined;
        return test = undefined;
      });

      it('should run mocha', () => assert.ok(runner.mocha.run.called));

      it('should generate mocha suite', function() {
        const {
          suites
        } = runner.mocha.suite;
        assert.equal(suites.length, 1);
        return assert.equal(suites[0].title, 'GET /machines -> 200');
      });

      return it('should generate pending mocha test', function() {
        const {
          tests
        } = runner.mocha.suite.suites[0];
        assert.equal(tests.length, 1);
        return assert.ok(tests[0].pending);
      });
    });


    describe('when test has no response schema', function() {

      before(function(done) {
        test = createStdTest();
        test.response.status = 200;

        const options =
          {server: `${SERVER}`};

        runner = new TestRunner(options, '');
        sinon.stub(runner.mocha, 'run')
          .callsFake(callback => callback());
        sinon.stub(test, 'run')
          .callsFake(callback => callback());

        return runner.run([test], hooksStub, done);
      });

      after(function() {
        runner.mocha.run.restore();
        runner = undefined;
        return test = undefined;
      });

      it('should run mocha', () => assert.ok(runner.mocha.run.called));

      it('should generate mocha suite', function() {
        const {
          suites
        } = runner.mocha.suite;
        assert.equal(suites.length, 1);
        return assert.equal(suites[0].title, 'GET /machines -> 200');
      });

      return it('should not generate pending mocha test', function() {
        const {
          tests
        } = runner.mocha.suite.suites[0];
        assert.equal(tests.length, 1);
        return assert.notOk(tests[0].pending);
      });
    });


    describe('when test throws Error', function() {

      let afterAllHook = undefined;

      before(function(done) {
        test = createStdTest();
        test.response.status = 200;

        afterAllHook = sinon.stub();
        afterAllHook.callsArg(0);

        hooksStub.afterAllHooks = [afterAllHook];

        const options =
          {server: `${SERVER}`};

        runner = new TestRunner(options, '');
        // sinon.stub runner.mocha, 'run', (callback) -> callback()
        const testStub = sinon.stub(test, 'run');
        testStub.throws(new Error('thrown from test#run'));

        // Mute stdout/stderr
        return mute(unmute => runner.run([test], hooksStub, function() {
          unmute();
          return done();
        }));
      });

      after(function() {
        afterAllHook = undefined;
        runner = undefined;
        return test = undefined;
      });

      return it('should call afterAll hook', () => afterAllHook.should.have.been.called);
    });


    return describe('when beforeAllHooks throws UncaughtError', function() {

      let beforeAllHook = undefined;
      let afterAllHook = undefined;

      before(function(done) {
        test = createStdTest();
        test.response.status = 200;

        beforeAllHook = sinon.stub();
        beforeAllHook.throws(new Error('thrown from beforeAll hook'));
        afterAllHook = sinon.stub();
        afterAllHook.callsArg(0);

        hooksStub.beforeAllHooks = [beforeAllHook];
        hooksStub.afterAllHooks = [afterAllHook];

        const options =
          {server: `${SERVER}`};

        runner = new TestRunner(options, '');
        sinon.stub(test, 'run')
          .callsFake(callback => callback());

        // Mute stdout/stderr
        return mute(unmute => runner.run([test], hooksStub, function() {
          unmute();
          return done();
        }));
      });

      after(function() {
        beforeAllHook = undefined;
        afterAllHook = undefined;
        runner = undefined;
        return test = undefined;
      });

      return it('should call afterAll hook', () => afterAllHook.should.have.been.called);
    });
  });


  return describe('#run with options', function() {

    describe('list all tests with `names`', function() {

      before(function(done) {
        test = createStdTest();
        test.response.status = 200;
        test.response.schema = `[
  type: 'string'
  name: 'string'
]`;

        const options =
          {names: true};

        runner = new TestRunner(options, '');
        sinon.stub(runner.mocha, 'run')
          .callsFake(callback => callback());
        sinon.spy(console, 'log');

        // Mute stdout/stderr
        return mute(unmute => runner.run([test], hooksStub, function() {
          unmute();
          return done();
        }));
      });

      after(function() {
        console.log.restore();
        runner.mocha.run.restore();
        runner = undefined;
        return test = undefined;
      });

      it('should not run mocha', () => assert.notOk(runner.mocha.run.called));

      return it('should print tests', () => assert.ok(console.log.calledWith('GET /machines -> 200')));
    });


    describe('add additional headers with `headers`', function() {

      let receivedTest = undefined;
      let headers = undefined;

      before(function(done) {
        test = createStdTest();
        test.response.status = 200;
        test.response.schema = {};

        headers = {
          key: 'value',
          'X-Abao-Version': pkg.version
        };

        const options = {
          server: `${SERVER}`,
          header: headers
        };

        runner = new TestRunner(options, '');
        sinon.stub(runner.mocha, 'run')
          .callsFake(function(callback) {
            receivedTest = _.cloneDeep(test);
            return callback();
        });

        return runner.run([test], hooksStub, done);
      });

      after(function() {
        runner.mocha.run.restore();
        runner = undefined;
        return test = undefined;
      });

      it('should run mocha', () => assert.ok(runner.mocha.run.called));

      return it('should add headers into test', function() {
        const pkgVersion = receivedTest.request.headers['X-Abao-Version'];
        expect(pkgVersion).to.equal(pkg.version);
        const userAgent = receivedTest.request.headers['User-Agent'];
        const userAgentPkgVersion = userAgent.split(' ')[0].split('/')[1];
        expect(userAgentPkgVersion).to.equal(pkgVersion);
        delete receivedTest.request.headers['User-Agent'];
        return assert.deepEqual(receivedTest.request.headers, headers);
      });
    });


    return describe('run test with hooks only indicated by `hooks-only`', function() {

      suiteStub = undefined;

      before(function(done) {
        test = createStdTest();
        test.response.status = 200;
        test.response.schema = {};

        const options = {
          server: `${SERVER}`,
          'hooks-only': true
        };

        runner = new TestRunner(options, '');

        const mochaStub = runner.mocha;
        const originSuiteCreate = mocha.Suite.create;
        sinon.stub(mocha.Suite, 'create')
          .callsFake(function(parent, title) {
            suiteStub = originSuiteCreate.call(mocha.Suite, parent, title);

            // Stub suite
            sinon.spy(suiteStub, 'addTest');
            sinon.spy(suiteStub, 'beforeAll');
            sinon.spy(suiteStub, 'afterAll');

            return suiteStub;
        });

        sinon.stub(mochaStub, 'run')
          .callsFake(callback => callback());

        return runner.run([test], hooksStub, done);
      });

      after(function() {
        suiteStub.addTest.restore();
        suiteStub.beforeAll.restore();
        suiteStub.afterAll.restore();
        mocha.Suite.create.restore();
        runner.mocha.run.restore();
        runner = undefined;
        return test = undefined;
      });

      it('should run mocha', () => assert.ok(runner.mocha.run.called));

      return it('should add a pending test');
    });
  });
});
        // TODO(quanlong): Implement this test
        // console.log suiteStub.addTest.printf('%n-%c-%C')
        // assert.ok suiteStub.addTest.calledWithExactly('GET /machines -> 200')

