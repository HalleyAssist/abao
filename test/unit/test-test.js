/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const chai = require('chai');
const _ = require('lodash');
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

const globStub = require('glob');
const pathStub = require('path');
const tv4Stub = require('tv4');

const hooksStub = require('../../lib/hooks');

const requestStub = sinon.stub();
requestStub.restore = function() {
  'use strict';
  return this.callsArgWith(1, null, {statusCode: 200}, '');
};

const TestFactory = proxyquire('../../lib/test', {
  'glob': globStub,
  'path': pathStub,
  'request': requestStub,
  'tv4': tv4Stub
});

const ABAO_IO_SERVER = 'http://abao.io';


describe('TestFactory', function() {
  'use strict';

  let factory = undefined;

  describe('constructor', function() {

    describe('with no pattern', function() {

      before(function() {
        sinon.spy(globStub, 'sync');
        sinon.spy(pathStub, 'resolve');
        return sinon.spy(tv4Stub, 'addSchema');
      });

      after(function() {
        globStub.sync.restore();
        pathStub.resolve.restore();
        tv4Stub.addSchema.restore();
        return factory = null;
      });

      return it('should return immediately', function(done) {
        factory = new TestFactory('');
        globStub.sync.notCalled;
        pathStub.resolve.notCalled;
        tv4Stub.addSchema.notCalled;
        return done();
      });
    });


    return describe('with pattern', function() {

      context('not matching any files', function() {

        const pattern = '/path/to/directory/without/schemas/*';
        let thrown = undefined;

        before(function() {
          sinon.stub(globStub, 'sync')
            .callsFake(pattern => []);
          sinon.spy(pathStub, 'resolve');
          return sinon.spy(tv4Stub, 'addSchema');
        });

        before(done => // Run test for all it()s here
        mute(function(unmute) {
          try {
            factory = new TestFactory(pattern);
          } catch (error) {
            thrown = error;
          }
          unmute();
          return done();
        }));

        after(function() {
          globStub.sync.restore();
          pathStub.resolve.restore();
          tv4Stub.addSchema.restore();
          factory = null;
          return thrown = null;
        });

        it('should not return any file names', function() {
          globStub.sync.called;
          return globStub.sync.should.have.returned([]);
      });

        it('should not attempt to load files', function() {
          pathStub.resolve.notCalled;
          return tv4Stub.addSchema.notCalled;
        });

        return it('should throw an error', function() {
          assert.isDefined(thrown);
          assert.instanceOf(thrown, Error);
          const detail = `no external schema files found matching pattern '${pattern}'`;
          return assert.equal(thrown.message, detail);
        });
      });


      return context('matching files', function() {

        const schemaDir = 'test/fixtures/schemas';
        const pattern = `${schemaDir}/*.json`;
        const schemaFile = `${schemaDir}/with-json-refs.json`;
        const borkenFile = `${schemaDir}/product-set-borken.json`;
        let thrown = undefined;
        let nfiles = 0;

        before(function() {
          sinon.stub(globStub, 'sync')
            .callsFake(function(pattern) {
              const retValue = [ schemaFile ];
              nfiles = retValue.length;
              return retValue;
          });
          sinon.spy(pathStub, 'resolve');
          return sinon.spy(tv4Stub, 'addSchema');
        });

        before(done => // Run test for all it()s here
        mute(function(unmute) {
          try {
            factory = new TestFactory(pattern);
          } catch (error) {
            thrown = error;
          }
          unmute();
          return done();
        }));

        after(function() {
          globStub.sync.restore();
          pathStub.resolve.restore();
          tv4Stub.addSchema.restore();
          return factory = null;
        });

        it('should return filenames', () => assert.ok(globStub.sync.called));

        return context('when files are valid JSON', function() {

          it('should load the file', () => pathStub.resolve.called);

          it('should add the schema', function() {
            tv4Stub.addSchema.called;
            return tv4Stub.addSchema.should.have.callCount(nfiles);
          });

          it('should not throw an error', () => assert.isUndefined(thrown));

          return it('should return the created object', () => assert.isDefined(factory));
        });
      });
    });
  });


  return describe('#create', function() {

    factory = undefined;
    let testName = undefined;
    let hookFunc = undefined;
    const dfltHookFunc = undefined;

    before(function() {
      factory = new TestFactory();
      testName = 'GET /machines -> 200';
      return hookFunc = function(response, body, done) {
        console.log('call me maybe');
        return done();
      };
    });

    return context('with valid parameters', () => it('should return the created object', function() {
      const test = factory.create(testName, hookFunc);
      assert.isDefined(test);
      assert.equal(test.name, testName);
      return assert.equal(test.contentTest, hookFunc);
    }));
  });
});


describe('Test', function() {
  'use strict';

  describe('#run', function() {

    describe('when basic test', function() {

      let test = undefined;
      let machine = undefined;
      let callback = undefined;
      let contentTestCalled = undefined;

      before(function(done) {
        const factory = new TestFactory();
        const testname = 'POST /machines -> 201';
        test = factory.create(testname);
        test.request.server = `${ABAO_IO_SERVER}`;
        test.request.path = '/machines';
        test.request.method = 'POST';
        test.request.params =
          {param: 'value'};
        test.request.query =
          {q: 'value'};
        test.request.headers =
          {key: 'value'};
        test.request.body =
          {body: 'value'};
        test.response.status = 201;
        test.response.schema = [{
          type: 'object',
          properties: {
            type: 'string',
            name: 'string'
          }
        }
        ];

        machine = {
          type: 'foo',
          name: 'bar'
        };

        contentTestCalled = false;
        test.contentTest = function(response, body, callback) {
          assert.equal(typeof response, 'object');
          assert.equal(typeof body, 'string');
          assert.equal(typeof callback, 'function');
          contentTestCalled = true;
          try {
            assert.equal(response.status, 201);
            assert.deepEqual(machine, JSON.parse(body));
          } catch (err) {
            return callback(err);
          }
          return callback(null);
        };

        requestStub.callsArgWith(1, null, {statusCode: 201}, JSON.stringify(machine));
        callback = sinon.stub();
        callback.returns(done());

        return test.run(callback);
      });

      after(() => requestStub.restore());

      it('should make HTTP request', function() {
        const options = {
          url: `${ABAO_IO_SERVER}/machines`,
          method: 'POST',
          headers: {
            key: 'value'
          },
          qs: {
            q: 'value'
          },
          body: JSON.stringify({
            body: 'value'}),
          timeout: 10000
        };
        return requestStub.should.be.calledWith(options);
      });

      it('should not modify @name', () => assert.equal(test.name, 'POST /machines -> 201'));

      it('should not modify @request', function() {
        const {
          request
        } = test;
        assert.equal(request.server, `${ABAO_IO_SERVER}`);
        assert.equal(request.path, '/machines');
        assert.equal(request.method, 'POST');
        assert.deepEqual(request.params, {param: 'value'});
        assert.deepEqual(request.query, {q: 'value'});
        return assert.deepEqual(request.headers, {key: 'value'});
    });

      it('should update @response', function() {
        const {
          response
        } = test;
        // Unchanged properties
        assert.equal(response.status, 201);
        // Changed properties
        return assert.deepEqual(response.body, machine);
      });

      it('should call contentTest', () => assert.isTrue(contentTestCalled));

      return it('should return successful continuation', function() {
        callback.should.have.been.calledOnce;
        return callback.should.have.been.calledWith(
          sinon.match.typeOf('null'));
      });
    });


    describe('when test contains params', function() {

      let test = undefined;
      let machine = undefined;
      let callback = undefined;

      before(function(done) {
        const factory = new TestFactory();
        const testname = 'PUT /machines/{machine_id} -> 200';
        test = factory.create(testname);
        test.request.server = `${ABAO_IO_SERVER}`;
        test.request.path = '/machines/{machine_id}';
        test.request.method = 'PUT';
        test.request.params =
          {machine_id: '1'};
        test.request.query =
          {q: 'value'};
        test.request.headers =
          {key: 'value'};
        test.request.body =
          {body: 'value'};
        test.response.status = 200;
        test.response.schema = [{
          type: 'object',
          properties: {
            type: 'string',
            name: 'string'
          }
        }
        ];

        machine = {
          type: 'foo',
          name: 'bar'
        };

        requestStub.callsArgWith(1, null, {statusCode: 200}, JSON.stringify(machine));
        callback = sinon.stub();
        callback.returns(done());

        return test.run(callback);
      });

      after(() => requestStub.restore());

      it('should make HTTP request', function() {
        const options = {
          url: `${ABAO_IO_SERVER}/machines/1`,
          method: 'PUT',
          headers: {
            key: 'value'
          },
          qs: {
            q: 'value'
          },
          body: JSON.stringify({
            body: 'value'}),
          timeout: 10000
        };
        return requestStub.should.be.calledWith(options);
      });

      it('should not modify @name', () => assert.equal(test.name, 'PUT /machines/{machine_id} -> 200'));

      it('should not modify @request', function() {
        const {
          request
        } = test;
        assert.equal(request.server, `${ABAO_IO_SERVER}`);
        assert.equal(request.path, '/machines/{machine_id}');
        assert.equal(request.method, 'PUT');
        assert.deepEqual(request.params, {machine_id: '1'});
        assert.deepEqual(request.query, {q: 'value'});
        return assert.deepEqual(request.headers, {key: 'value'});
    });

      it('should update @response', function() {
        const {
          response
        } = test;
        // Unchanged properties
        assert.equal(response.status, 200);
        return assert.deepEqual(response.body, machine);
      });

      return it('should return successful continuation', function() {
        callback.should.have.been.calledOnce;
        return callback.should.have.been.calledWith(
          sinon.match.typeOf('null'));
      });
    });


    return describe('when HTTP request fails due to Error', function() {

      let factory = undefined;
      let test = undefined;
      let err = undefined;
      let callback = undefined;

      before(function() {
        requestStub.reset();
        factory = new TestFactory();
        const testname = 'POST /machines -> 201';
        test = factory.create(testname);
        test.request.server = `${ABAO_IO_SERVER}`;
        test.request.method = 'POST';
        test.request.path = '/machines';
        return test.request.body = 'dontcare';
      });

      context('while attempting to connect', function() {

        before(function(done) {
          err = new Error('ETIMEDOUT');
          err.code = 'ETIMEDOUT';
          err.connect = true;

          requestStub.callsArgWith(1, err);
          callback = sinon.spy();
          return callback.returns(done());
        });

        after(() => requestStub.restore());

        return it('should propagate the error condition', function() {
          test.run(callback);
          const detail = 'timed out attempting to establish connection';
          callback.should.have.been.calledOnce;
          const error = callback.args[0][0];
          expect(error).to.exist;
          expect(error).to.be.instanceof(Error);
          expect(error).to.have.property('code', 'ETIMEDOUT');
          expect(error).to.have.property('connect', true);
          return expect(error).to.have.property('message', detail);
        });
      });


      context('while awaiting server response', function() {

        before(function(done) {
          err = new Error('ETIMEDOUT');
          err.code = 'ETIMEDOUT';
          err.connect = false;

          requestStub.callsArgWith(1, err);
          callback = sinon.spy();
          return callback.returns(done());
        });

        after(() => requestStub.restore());

        return it('should propagate the error condition', function() {
          test.run(callback);
          const detail = 'timed out awaiting server response';
          callback.should.have.been.calledOnce;
          const error = callback.args[0][0];
          expect(error).to.exist;
          expect(error).to.be.instanceof(Error);
          expect(error).to.have.property('code', 'ETIMEDOUT');
          return expect(error).to.have.property('message', detail);
        });
      });


      context('when server stopped sending response data', function() {

        before(function(done) {
          err = new Error('ESOCKETTIMEDOUT');
          err.code = 'ESOCKETTIMEDOUT';
          err.connect = false;

          requestStub.callsArgWith(1, err);
          callback = sinon.spy();
          return callback.returns(done());
        });

        after(() => requestStub.restore());

        return it('should propagate the error condition', function() {
          test.run(callback);
          const detail = 'timed out when server stopped sending response data';
          callback.should.have.been.calledOnce;
          const error = callback.args[0][0];
          expect(error).to.exist;
          expect(error).to.be.instanceof(Error);
          expect(error).to.have.property('code', 'ESOCKETTIMEDOUT');
          return expect(error).to.have.property('message', detail);
        });
      });


      return context('when connection reset by server', function() {

        before(function(done) {
          err = new Error('ECONNRESET');
          err.code = 'ECONNRESET';

          requestStub.callsArgWith(1, err);
          callback = sinon.spy();
          return callback.returns(done());
        });

        after(() => requestStub.restore());

        return it('should propagate the error condition', function() {
          test.run(callback);
          const detail = 'connection reset by server';
          callback.should.have.been.calledOnce;
          const error = callback.args[0][0];
          expect(error).to.exist;
          expect(error).to.be.instanceof(Error);
          expect(error).to.have.property('code', 'ECONNRESET');
          return expect(error).to.have.property('message', detail);
        });
      });
    });
  });


  describe('#url', function() {

    describe('when called with path that does not contain param', function() {

      const factory = new TestFactory();
      const test = factory.create();
      test.request.path = '/machines';

      return it('should return origin path', () => assert.equal(test.url(), '/machines'));
    });


    return describe('when called with path that contains param', function() {

      const factory = new TestFactory();
      const test = factory.create();
      test.request.path = '/machines/{machine_id}/parts/{part_id}';
      test.request.params = {
        machine_id: 'tianmao',
        part_id: 2
      };

      it('should replace all params', () => assert.equal(test.url(), '/machines/tianmao/parts/2'));

      return it('should not touch origin request.path', () => assert.equal(test.request.path, '/machines/{machine_id}/parts/{part_id}'));
    });
  });


  return describe('#validateResponse', function() {

    let responseStub = undefined;
    let bodyStub = undefined;

    const factory = new TestFactory();
    const test = factory.create();
    test.response.status = 201;
    test.response.schema = {
      $schema: 'http://json-schema.org/draft-04/schema#',
      type: 'object',
      properties: {
        type: {
          type: 'string'
        },
        name: {
          type: 'string'
        }
      }
    };

    describe('when given valid response', function() {

      before(function() {
        responseStub =
          {statusCode: 201};
        return bodyStub = JSON.stringify({
          type: 'foo',
          name: 'bar'
        });
      });

      return it('should not throw', function() {
        const fn = _.partial(test.validateResponse, responseStub, bodyStub);
        return assert.doesNotThrow(fn);
      });
    });


    return describe('when given invalid response', function() {

      describe('when response body is empty', function() {

        before(function() {
          responseStub =
            {statusCode: 201};
          return bodyStub = '';
        });

        return it('should throw Error', function() {
          const fn = _.partial(test.validateResponse, responseStub, bodyStub);
          return assert.throws(fn, Error, /response body is empty/);
        });
      });


      describe('when response body is invalid JSON', function() {

        before(function() {
          responseStub =
            {statusCode: 201};
          return bodyStub = 'Im invalid';
        });

        return it('should throw SyntaxError', function() {
          const fn = _.partial(test.validateResponse, responseStub, bodyStub);
          return assert.throws(fn, SyntaxError, /Unexpected token/);
        });
      });


      return describe('when response body is null', function() {

        before(function() {
          responseStub =
            {statusCode: 201};
          return bodyStub = null;
        });

        return it('should throw Error', function() {
          const fn = _.partial(test.validateResponse, responseStub, bodyStub);
          return assert.throws(fn, Error, /schema validation failed/);
        });
      });
    });
  });
});

