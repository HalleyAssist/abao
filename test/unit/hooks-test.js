/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
require('coffee-errors');
const sinon = require('sinon');
const {assert} = require('chai');

const TestFactoryStub = require('../../lib/test');

const hooks = require('../../lib/hooks');

const ABAO_IO_SERVER = 'http://abao.io';

describe('Hooks', function() {
  'use strict';

  const noop = () => ({});

  describe('when adding before hook', function() {

    before(() => hooks.before('beforeHook', noop));

    after(() => hooks.beforeHooks = {});

    return it('should add to hook collection', function() {
      assert.property(hooks.beforeHooks, 'beforeHook');
      return assert.lengthOf(hooks.beforeHooks['beforeHook'], 1);
    });
  });

  describe('when adding after hook', function() {

    before(() => hooks.after('afterHook', noop));

    after(() => hooks.afterHooks = {});

    return it('should add to hook collection', () => assert.property(hooks.afterHooks, 'afterHook'));
  });

  describe('when adding beforeAll hooks', function() {

    afterEach(() => hooks.beforeAllHooks = []);

    return it('should invoke registered callbacks', function(testDone) {
      const callback = sinon.stub();
      callback.callsArg(0);

      hooks.beforeAll(callback);
      hooks.beforeAll(function(done) {
        assert.ok(typeof done === 'function');
        assert.ok(callback.called);
        return done();
      });
      return hooks.runBeforeAll(done => testDone());
    });
  });

  describe('when adding afterAll hooks', function() {

    afterEach(() => hooks.afterAllHooks = []);

    return it('should callback if registered', function(testDone) {
      const callback = sinon.stub();
      callback.callsArg(0);

      hooks.afterAll(callback);
      hooks.afterAll(function(done) {
        assert.ok(typeof done === 'function');
        assert.ok(callback.called);
        return done();
      });
      return hooks.runAfterAll(done => testDone());
    });
  });

  describe('when adding beforeEach hooks', function() {

    afterEach(function() {
      hooks.beforeEachHooks = [];
      return hooks.beforeHooks = {};});

    it('should add to hook list', function() {
      hooks.beforeEach(noop);
      return assert.lengthOf(hooks.beforeEachHooks, 1);
    });

    it('should invoke registered callbacks', function(testDone) {
      let before_called = false;
      let before_each_called = false;
      const test_name = 'before_test';
      hooks.before(test_name, function(test, done) {
        assert.equal(test.name, test_name);
        before_called = true;
        assert.isTrue(before_each_called,
          'before_hook should be called after before_each');
        return done();
      });

      hooks.beforeEach(function(test, done) {
        assert.equal(test.name, test_name);
        before_each_called = true;
        assert.isFalse(before_called,
          'before_each should be called before before_hook');
        return done();
      });

      return hooks.runBefore({name: test_name}, function() {
        assert.isTrue(before_each_called, 'before_each should have been called');
        assert.isTrue(before_called, 'before_hook should have been called');
        return testDone();
      });
    });

    return it('should work without test-specific before', function(testDone) {
      let before_each_called = false;
      const test_name = 'before_test';
      hooks.beforeEach(function(test, done) {
        assert.equal(test.name, test_name);
        before_each_called = true;
        return done();
      });

      return hooks.runBefore({name: test_name}, function() {
        assert.isTrue(before_each_called, 'before_each should have been called');
        return testDone();
      });
    });
  });

  describe('when adding afterEach hooks', function() {

    afterEach(function() {
      hooks.afterEachHooks = [];
      return hooks.afterHooks = {};});

    it('should add to hook list', function() {
      hooks.afterEach(noop);
      return assert.lengthOf(hooks.afterEachHooks, 1);
    });

    it('should invoke registered callbacks', function(testDone) {
      let after_called = false;
      let after_each_called = false;
      const test_name = 'after_test';
      hooks.after(test_name, function(test, done) {
        assert.equal(test.name, test_name);
        after_called = true;
        assert.isFalse(after_each_called,
          'after_hook should be called before after_each');
        return done();
      });

      hooks.afterEach(function(test, done) {
        assert.equal(test.name, test_name);
        after_each_called = true;
        assert.isTrue(after_called,
          'after_each should be called after after_hook');
        return done();
      });

      return hooks.runAfter({name: test_name}, function() {
        assert.isTrue(after_each_called, 'after_each should have been called');
        assert.isTrue(after_called, 'after_hook should have been called');
        return testDone();
      });
    });

    return it('should work without test-specific after', function(testDone) {
      let after_each_called = false;
      const test_name = 'after_test';
      hooks.afterEach(function(test, done) {
        assert.equal(test.name, test_name);
        after_each_called = true;
        return done();
      });

      return hooks.runAfter({name: test_name}, function() {
        assert.isTrue(after_each_called, 'after_each should have been called');
        return testDone();
      });
    });
  });

  describe('when check has name', function() {

    it('should return true if in before hooks', function() {
      hooks.beforeHooks = {
        foo(test, done) {
          return done();
        }
      };

      assert.ok(hooks.hasName('foo'));

      return hooks.beforeHooks = {};
  });

    it('should return true if in after hooks', function() {
      hooks.afterHooks = {
        foo(test, done) {
          return done();
        }
      };

      assert.ok(hooks.hasName('foo'));

      return hooks.afterHooks = {};
  });

    it('should return true if in both before and after hooks', function() {
      hooks.beforeHooks = {
        foo(test, done) {
          return done();
        }
      };
      hooks.afterHooks = {
        foo(test, done) {
          return done();
        }
      };

      assert.ok(hooks.hasName('foo'));

      hooks.beforeHooks = {};
      return hooks.afterHooks = {};
  });

    return it('should return false if in neither before nor after hooks', () => assert.notOk(hooks.hasName('foo')));
  });


  describe('when running hooks', function() {

    let beforeHook = '';
    let afterHook = '';

    beforeEach(function() {
      beforeHook = sinon.stub();
      beforeHook.callsArg(1);

      afterHook = sinon.stub();
      afterHook.callsArg(1);

      hooks.beforeHooks =
        {'GET /machines -> 200': [beforeHook]};
      return hooks.afterHooks =
        {'GET /machines -> 200': [afterHook]};});

    afterEach(function() {
      hooks.beforeHooks = {};
      hooks.afterHooks = {};
      beforeHook = '';
      return afterHook = '';
    });

    describe('with corresponding GET test', function() {

      const testFactory = new TestFactoryStub();
      const test = testFactory.create();
      test.name = 'GET /machines -> 200';
      test.request.server = `${ABAO_IO_SERVER}`;
      test.request.path = '/machines';
      test.request.method = 'GET';
      test.request.params =
        {param: 'value'};
      test.request.query =
        {q: 'value'};
      test.request.headers =
        {key: 'value'};
      test.response.status = 200;
      test.response.schema = `\
[
  type: 'string'
  name: 'string'
]\
`;

      describe('on before hook', function() {
        beforeEach(done => hooks.runBefore(test, done));

        it('should run hook', () => assert.ok(beforeHook.called));

        return it('should pass #test to hook', () => assert.ok(beforeHook.calledWith(test)));
      });

      return describe('on after hook', function() {
        beforeEach(done => hooks.runAfter(test, done));

        it('should run hook', () => assert.ok(afterHook.called));

        return it('should pass #test to hook', () => assert.ok(afterHook.calledWith(test)));
      });
    });

    return describe('with corresponding POST test', function() {

      const testFactory = new TestFactoryStub();
      const test = testFactory.create();
      test.name = 'POST /machines -> 201';
      test.request.server = `${ABAO_IO_SERVER}`;
      test.request.path = '/machines';
      test.request.method = 'POST';
      test.request.params =
        {param: 'value'};
      test.request.query =
        {q: 'value'};
      test.request.headers =
        {key: 'value'};
      test.response.status = 201;
      test.response.schema = `\
type: 'string'
name: 'string'\
`;

      describe('on before hook', function() {
        beforeEach(done => hooks.runBefore(test, done));

        return it('should not run hook', () => assert.ok(beforeHook.notCalled));
      });

      return describe('on after hook', function() {
        beforeEach(done => hooks.runAfter(test, done));

        return it('should not run hook', () => assert.ok(afterHook.notCalled));
      });
    });
  });

  describe('when running beforeAll/afterAll', function() {

    let funcs = [];

    before(function() {
      for (let i = 1; i <= 4; i++) {
        var hook = sinon.stub();
        hook.callsArg(0);
        funcs.push(hook);
      }

      hooks.beforeAllHooks = [funcs[0], funcs[1]];
      return hooks.afterAllHooks = [funcs[2], funcs[3]];});

    after(function() {
      hooks.beforeAllHooks = [];
      hooks.afterAllHooks = [];
      return funcs = [];});

    describe('on beforeAll hook', function() {
      let callback = '';

      before(function(done) {
        callback = sinon.stub();
        callback.returns(done());

        return hooks.runBeforeAll(callback);
      });

      it('should invoke callback', () => assert.ok(callback.calledWithExactly(null), callback.printf('%C')));

      return it('should run hook', function() {
        assert.ok(funcs[0].called);
        return assert.ok(funcs[1].called);
      });
    });

    return describe('on afterAll hook', function() {
      let callback = '';

      before(function(done) {
        callback = sinon.stub();
        callback.returns(done());

        return hooks.runAfterAll(callback);
      });

      it('should invoke callback', () => assert.ok(callback.calledWithExactly(null), callback.printf('%C')));

      return it('should run hook', function() {
        assert.ok(funcs[2].called);
        return assert.ok(funcs[3].called);
      });
    });
  });

  describe('when successfully adding test hook', function() {

    afterEach(() => hooks.contentTests = {});

    const test_name = 'content_test_test';

    return it('should get added to the set of hooks', function() {
      hooks.test(test_name, noop);
      return assert.isDefined(hooks.contentTests[test_name]);
  });
});

  describe('adding two content tests fails', function() {
    afterEach(() => hooks.contentTests = {});

    const test_name = 'content_test_test';

    return it('should assert when attempting to add a second content test', function() {
      const f = () => hooks.test(test_name, noop);
      f();
      return assert.throws(f,
        `cannot have more than one test with the name: ${test_name}`);
    });
  });

  describe('when check skipped', function() {

    beforeEach(() => hooks.skippedTests = ['foo']);

    afterEach(() => hooks.skippedTests = []);

    it('should return true if in skippedTests', () => assert.ok(hooks.skipped('foo')));

    return it('should return false if not in skippedTests', () => assert.notOk(hooks.skipped('buz')));
  });

  return describe('when successfully skip test', function() {

    afterEach(() => hooks.skippedTests = []);

    const test_name = 'content_test_test';

    return it('should get added to the set of hooks', function() {
      hooks.skip(test_name);
      return assert.include(hooks.skippedTests, test_name);
    });
  });
});

