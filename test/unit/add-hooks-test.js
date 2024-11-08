/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
require('coffee-errors');
const chai = require('chai');
chai.use(require('sinon-chai'));
const {EventEmitter} = require('events');
const mute = require('mute');
const nock = require('nock');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const {
  assert
} = chai;
const {
  expect
} = chai;
const should = chai.should();

const globStub = require('glob');
const pathStub = require('path');
const hooksStub = require('../../lib/hooks');

const addHooks = proxyquire('../../lib/add-hooks', {
  'glob': globStub,
  'path': pathStub
});

describe('addHooks(hooks, pattern, callback)', function() {
  'use strict';

  let callback = undefined;
  let globSyncSpy = undefined;
  let addHookSpy = undefined;
  let pathResolveSpy = undefined;
  let consoleErrorSpy = undefined;
  const transactions = {};

  describe('with no pattern', function() {

    before(function() {
      callback = sinon.spy();
      return globSyncSpy = sinon.spy(globStub, 'sync');
    });

    it('should return immediately', function(done) {
      addHooks(hooksStub, '', callback);
      globSyncSpy.should.not.have.been.called;
      return done();
    });

    it('should return successful continuation', function() {
      callback.should.have.been.calledOnce;
      return callback.should.have.been.calledWith(
        sinon.match.typeOf('null'));
    });

    return after(() => globStub.sync.restore());
  });


  return describe('with pattern', function() {

    context('not matching any files', function() {

      const pattern = '/path/to/directory/without/hooks/*';

      beforeEach(function() {
        callback = sinon.spy();
        addHookSpy = sinon.spy(hooksStub, 'addHook');
        globSyncSpy = sinon.stub(globStub, 'sync')
          .callsFake(pattern => []);
        return pathResolveSpy = sinon.spy(pathStub, 'resolve');
      });

      it('should not return any file names', done => mute(function(unmute) {
        addHooks(hooksStub, pattern, callback);
        globSyncSpy.should.have.returned([]);
        unmute();
        return done();
      }));

      it('should not attempt to load files', done => mute(function(unmute) {
        addHooks(hooksStub, pattern, callback);
        pathResolveSpy.should.not.have.been.called;
        unmute();
        return done();
      }));

      it('should propagate the error condition', done => mute(function(unmute) {
        addHooks(hooksStub, pattern, callback);
        callback.should.have.been.calledOnce;
        const detail = `no hook files found matching pattern '${pattern}'`;
        callback.should.have.been.calledWith(
          sinon.match.instanceOf(Error).and(
            sinon.match.has('message', detail)));
        unmute();
        return done();
      }));

      return afterEach(function() {
        hooksStub.addHook.restore();
        globStub.sync.restore();
        return pathStub.resolve.restore();
      });
    });


    return context('matching files', function() {

      const pattern = './test/**/*_hooks.*';

      it('should return file names', done => mute(function(unmute) {
        globSyncSpy = sinon.spy(globStub, 'sync');
        addHooks(hooksStub, pattern, callback);
        globSyncSpy.should.have.been.called;
        globStub.sync.restore();
        unmute();
        return done();
      }));


      context('when files are valid javascript/coffeescript', function() {

        beforeEach(function() {
          callback = sinon.spy();
          globSyncSpy = sinon.spy(globStub, 'sync');
          pathResolveSpy = sinon.spy(pathStub, 'resolve');
          return addHookSpy = sinon.spy(hooksStub, 'addHook');
        });

        it('should load the files', done => mute(function(unmute) {
          addHooks(hooksStub, pattern, callback);
          pathResolveSpy.should.have.been.called;
          unmute();
          return done();
        }));

        it('should attach the hooks', done => mute(function(unmute) {
          addHooks(hooksStub, pattern, callback);
          addHookSpy.should.have.been.called;
          unmute();
          return done();
        }));

        it('should return successful continuation', done => mute(function(unmute) {
          addHooks(hooksStub, pattern, callback);
          callback.should.have.been.calledOnce;
          callback.should.have.been.calledWith(
            sinon.match.typeOf('null'));
          unmute();
          return done();
        }));

        return afterEach(function() {
          globStub.sync.restore();
          pathStub.resolve.restore();
          return hooksStub.addHook.restore();
        });
      });


      return context('when error occurs reading the hook files', function() {

        addHookSpy = undefined;
        consoleErrorSpy = undefined;

        beforeEach(function() {
          callback = sinon.spy();
          pathResolveSpy = sinon.stub(pathStub, 'resolve')
            .callsFake(function(path, rel) {
              throw new Error('resolve');
          });
          consoleErrorSpy = sinon.spy(console, 'error');
          globSyncSpy = sinon.stub(globStub, 'sync')
            .callsFake(pattern => ['invalid.xml', 'unexist.md']);
          return addHookSpy = sinon.spy(hooksStub, 'addHook');
        });

        it('should log an error', done => mute(function(unmute) {
          addHooks(hooksStub, pattern, callback);
          consoleErrorSpy.should.have.been.called;
          unmute();
          return done();
        }));

        it('should not attach the hooks', done => mute(function(unmute) {
          addHooks(hooksStub, pattern, callback);
          addHookSpy.should.not.have.been.called;
          unmute();
          return done();
        }));

        it('should propagate the error condition', done => mute(function(unmute) {
          addHooks(hooksStub, pattern, callback);
          callback.should.have.been.calledOnce;
          callback.should.have.been.calledWith(
            sinon.match.instanceOf(Error).and(
              sinon.match.has('message', 'resolve')));
          unmute();
          return done();
        }));

        return afterEach(function() {
          pathStub.resolve.restore();
          console.error.restore();
          globStub.sync.restore();
          return hooksStub.addHook.restore();
        });
      });
    });
  });
});

