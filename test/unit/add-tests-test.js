/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const chai = require('chai');
const mocha = require('mocha');
const proxyquire = require('proxyquire').noCallThru();
const raml2obj = require('raml2obj');
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

const TestFactory = require('../../lib/test');
const hooks = require('../../lib/hooks');
const addTests = proxyquire('../../lib/add-tests', {
  'mocha': mocha
});

const FIXTURE_DIR = `${__dirname}/../fixtures`;
const RAML_DIR = `${FIXTURE_DIR}`;


describe('addTests(raml, tests, hooks, parent, callback, factory, sortFirst)', function() {
  'use strict';

  return describe('run', function() {

    describe('when endpoint specifies a single method', function() {

      let tests = [];
      const testFactory = new TestFactory();
      let callback = undefined;

      before(function(done) {
        const ramlFile = `${RAML_DIR}/machines-single_get.raml`;
        raml2obj.parse(ramlFile)
          .then(function(raml) {
            callback = sinon.stub();
            callback.returns(done());

            return addTests(raml, tests, hooks, callback, testFactory, false);}).catch(function(err) {
            console.error(err);
            return done(err);
        });
      });

      after(() => tests = []);

      it('should run callback', () => assert.ok(callback.called));

      it('should add 1 test', () => assert.lengthOf(tests, 1));

      it('should set test.name', () => assert.equal(tests[0].name, 'GET /machines -> 200'));

      it('should setup test.request', function() {
        const req = tests[0].request;

        assert.equal(req.path, '/machines');
        assert.deepEqual(req.params, {});
        assert.deepEqual(req.query, {});
        assert.deepEqual(req.headers,
          {'Abao-API-Key': 'abcdef'});
        req.body.should.be.empty;
        return assert.equal(req.method, 'GET');
      });

      return it('should setup test.response', function() {
        const res = tests[0].response;

        assert.equal(res.status, 200);
        const {
          schema
        } = res;
        assert.equal(schema.items.properties.type.type, 'string');
        assert.equal(schema.items.properties.name.type, 'string');
        assert.isNull(res.headers);
        return assert.isNull(res.body);
      });
    });


    describe('when endpoint has multiple methods', function() {

      describe('when processed in order specified in RAML', function() {

        let tests = [];
        const testFactory = new TestFactory();
        let callback = undefined;

        before(function(done) {
          const ramlFile = `${RAML_DIR}/machines-1_get_1_post.raml`;
          raml2obj.parse(ramlFile)
            .then(function(raml) {
              callback = sinon.stub();
              callback.returns(done());

              return addTests(raml, tests, hooks, callback, testFactory, false);}).catch(function(err) {
              console.error(err);
              return done(err);
          });
        });

        after(() => tests = []);

        it('should run callback', () => assert.ok(callback.called));

        it('should add 2 tests', () => assert.lengthOf(tests, 2));

        it('should process GET request before POST request', function() {
          let req = tests[0].request;
          assert.equal(req.method, 'GET');
          req = tests[1].request;
          return assert.equal(req.method, 'POST');
        });

        it('should setup test.request of POST', function() {
          const req = tests[1].request;

          assert.equal(req.path, '/machines');
          assert.deepEqual(req.params, {});
          assert.deepEqual(req.query, {});
          assert.deepEqual(req.headers,
            {'Content-Type': 'application/json'});
          assert.deepEqual(req.body, {
            type: 'Kulu',
            name: 'Mike'
          }
          );
          return assert.equal(req.method, 'POST');
        });

        return it('should setup test.response of POST', function() {
          const res = tests[1].response;

          assert.equal(res.status, 201);
          const {
            schema
          } = res;
          assert.equal(schema.properties.type.type, 'string');
          assert.equal(schema.properties.name.type, 'string');
          assert.isNull(res.headers);
          return assert.isNull(res.body);
        });
      });


      return describe('when processed in order specified by "--sorted" option', function() {

        let tests = [];
        const testFactory = new TestFactory();
        let callback = undefined;

        before(function(done) {
          const ramlFile = `${RAML_DIR}/machines-1_get_1_post.raml`;
          raml2obj.parse(ramlFile)
            .then(function(raml) {
              callback = sinon.stub();
              callback.returns(done());

              return addTests(raml, tests, hooks, null, callback, testFactory, true);}).catch(function(err) {
              console.error(err);
              return done(err);
          });
        });

        after(() => tests = []);

        it('should run callback', () => assert.ok(callback.called));

        it('should add 2 tests', () => assert.lengthOf(tests, 2));

        it('should process GET request after POST request', function() {
          let req = tests[0].request;
          assert.equal(req.method, 'POST');
          req = tests[1].request;
          return assert.equal(req.method, 'GET');
        });

        it('should setup test.request of POST', function() {
          const req = tests[0].request;

          assert.equal(req.path, '/machines');
          assert.deepEqual(req.params, {});
          assert.deepEqual(req.query, {});
          assert.deepEqual(req.headers,
            {'Content-Type': 'application/json'});
          assert.deepEqual(req.body, {
            type: 'Kulu',
            name: 'Mike'
          }
          );
          return assert.equal(req.method, 'POST');
        });

        return it('should setup test.response of POST', function() {
          const res = tests[0].response;

          assert.equal(res.status, 201);
          const {
            schema
          } = res;
          assert.equal(schema.properties.type.type, 'string');
          assert.equal(schema.properties.name.type, 'string');
          assert.isNull(res.headers);
          return assert.isNull(res.body);
        });
      });
    });


    describe('when RAML includes multiple referencing schemas', function() {

      let tests = [];
      const testFactory = new TestFactory();
      let callback = undefined;

      before(function(done) {
        const ramlFile = `${RAML_DIR}/machines-ref_other_schemas.raml`;
        raml2obj.parse(ramlFile)
          .then(function(raml) {
            callback = sinon.stub();
            callback.returns(done());

            return addTests(raml, tests, hooks, callback, testFactory, false);}).catch(function(err) {
            console.error(err);
            return done(err);
        });
      });

      after(() => tests = []);

      it('should run callback', () => assert.ok(callback.called));

      it('should add 1 test', () => assert.lengthOf(tests, 1));

      it('should set test.name', () => assert.equal(tests[0].name, 'GET /machines -> 200'));

      it('should setup test.request', function() {
        const req = tests[0].request;

        assert.equal(req.path, '/machines');
        assert.deepEqual(req.params, {});
        assert.deepEqual(req.query, {});
        req.body.should.be.empty;
        return assert.equal(req.method, 'GET');
      });

      return it('should setup test.response', function() {
        const res = tests[0].response;

        assert.equal(res.status, 200);
        assert.equal(__guard__(__guard__(res.schema != null ? res.schema.properties : undefined, x1 => x1.chick), x => x.type), 'string');
        assert.isNull(res.headers);
        return assert.isNull(res.body);
      });
    });


    describe('when RAML has inline and included schemas', function() {

      let tests = [];
      const testFactory = new TestFactory();
      let callback = undefined;

      before(function(done) {
        const ramlFile = `${RAML_DIR}/machines-inline_and_included_schemas.raml`;
        raml2obj.parse(ramlFile)
          .then(function(raml) {
            callback = sinon.stub();
            callback.returns(done());

            return addTests(raml, tests, hooks, callback, testFactory, false);}).catch(function(err) {
            console.error(err);
            return done(err);
        });
      });

      after(() => tests = []);

      it('should run callback', () => assert.ok(callback.called));

      it('should add 1 test', () => assert.lengthOf(tests, 1));

      it('should set test.name', () => assert.equal(tests[0].name, 'GET /machines -> 200'));

      it('should setup test.request', function() {
        const req = tests[0].request;

        assert.equal(req.path, '/machines');
        assert.deepEqual(req.params, {});
        assert.deepEqual(req.query, {});
        req.body.should.be.empty;
        return assert.equal(req.method, 'GET');
      });

      return it('should setup test.response', function() {
        const res = tests[0].response;

        assert.equal(res.status, 200);
        assert.equal(__guard__(res.schema != null ? res.schema.properties : undefined, x => x.type['$ref']), 'type2');
        assert.isNull(res.headers);
        return assert.isNull(res.body);
      });
    });


    describe('when RAML contains three-levels endpoints', function() {

      let tests = [];
      const testFactory = new TestFactory();
      let callback = undefined;

      before(function(done) {
        const ramlFile = `${RAML_DIR}/machines-three_levels.raml`;
        raml2obj.parse(ramlFile)
          .then(function(raml) {
            callback = sinon.stub();
            callback.returns(done());

            return addTests(raml, tests, hooks, callback, testFactory, false);}).catch(function(err) {
            console.error(err);
            return done(err);
        });
      });

      after(() => tests = []);

      it('should run callback', () => assert.ok(callback.called));

      it('should add 3 tests', () => assert.lengthOf(tests, 3));

      it('should set test.name', function() {
        assert.equal(tests[0].name, 'GET /machines -> 200');
        assert.equal(tests[1].name, 'DELETE /machines/{machine_id} -> 204');
        return assert.equal(tests[2].name, 'GET /machines/{machine_id}/parts -> 200');
      });

      it('should set request.param of test 1', function() {
        const test = tests[1];
        return assert.deepEqual(test.request.params,
          {machine_id: '1'});
      });

      return it('should set request.param of test 2', function() {
        const test = tests[2];
        return assert.deepEqual(test.request.params,
          {machine_id: '1'});
      });
    });


    describe('when RAML has resource not defined method', function() {

      let tests = [];
      const testFactory = new TestFactory();
      let callback = undefined;

      before(function(done) {
        const ramlFile = `${RAML_DIR}/machines-no_method.raml`;
        raml2obj.parse(ramlFile)
          .then(function(raml) {
            callback = sinon.stub();
            callback.returns(done());

            return addTests(raml, tests, hooks, callback, testFactory, false);}).catch(function(err) {
            console.error(err);
            return done(err);
        });
      });

      after(() => tests = []);

      it('should run callback', () => assert.ok(callback.called));

      it('should add 1 test', () => assert.lengthOf(tests, 1));

      return it('should set test.name', () => assert.equal(tests[0].name, 'GET /root/machines -> 200'));
    });


    describe('when RAML has invalid request body example', function() {

      let tests = [];
      const testFactory = new TestFactory();
      let callback = undefined;

      before(function(done) {
        const raml = `\
#%RAML 0.8

title: World Music API
baseUri: http://example.api.com/{version}
version: v1
mediaType: application/json

/machines:
  post:
    body:
      example: 'invalid-json'
    responses:
      204:\
`;
        ramlParser.load(raml)
          .then(function(raml) {
            callback = sinon.stub();
            callback.returns(done());

            sinon.stub(console, 'warn');
            return addTests(raml, tests, hooks, callback, testFactory, false);}).catch(function(err) {
            console.error(err);
            return done(err);
        });
      });

      after(function() {
        tests = [];
        return console.warn.restore();
      });

      it('should run callback', () => assert.ok(callback.called));

      it('should give a warning', () => assert.ok(console.warn.called));

      return it('should add 1 test', function() {
        assert.lengthOf(tests, 1);
        return assert.equal(tests[0].name, 'POST /machines -> 204');
      });
    });


    describe('when RAML media type uses a JSON-suffixed vendor tree subtype', function() {

      let tests = [];
      const testFactory = new TestFactory();
      let callback = undefined;

      before(function(done) {
        const ramlFile = `${RAML_DIR}/music-vendor_content_type.raml`;
        raml2obj.parse(ramlFile)
          .then(function(raml) {
            callback = sinon.stub();
            callback.returns(done());

            return addTests(raml, tests, hooks, callback, testFactory, false);}).catch(function(err) {
            console.error(err);
            return done(err);
        });
      });

      after(() => tests = []);

      it('should run callback', () => assert.ok(callback.called));

      it('should add 1 test', () => assert.lengthOf(tests, 1));

      it('should setup test.request of PATCH', function() {
        const req = tests[0].request;

        assert.equal(req.path, '/{songId}');
        assert.deepEqual(req.params,
          {songId: 'mike-a-beautiful-day'});
        assert.deepEqual(req.query, {});
        assert.deepEqual(req.headers,
          {'Content-Type': 'application/vnd.api+json'});
        assert.deepEqual(req.body, {
          title: 'A Beautiful Day',
          artist: 'Mike'
        }
        );
        return assert.equal(req.method, 'PATCH');
      });

      return it('should setup test.response of PATCH', function() {
        const res = tests[0].response;

        assert.equal(res.status, 200);
        const {
          schema
        } = res;
        assert.equal(schema.properties.title.type, 'string');
        return assert.equal(schema.properties.artist.type, 'string');
      });
    });


    describe('when there is required query parameter with example value', function() {

      let tests = [];
      const testFactory = new TestFactory();
      let callback = undefined;

      before(function(done) {
        const ramlFile = `${RAML_DIR}/machines-required_query_parameter.raml`;
        raml2obj.parse(ramlFile)
          .then(function(raml) {
            callback = sinon.stub();
            callback.returns(done());

            return addTests(raml, tests, hooks, callback, testFactory, false);}).catch(function(err) {
            console.error(err);
            return done(err);
        });
      });

      after(() => tests = []);

      it('should run callback', () => assert.ok(callback.called));

      it('should add 1 test', () => assert.lengthOf(tests, 1));

      return it('should append query parameters with example value', () => assert.equal(tests[0].request.query['quux'], 'foo'));
    });


    return describe('when there is no required query parameter', function() {

      let tests = [];
      const testFactory = new TestFactory();
      let callback = undefined;

      before(function(done) {
        const ramlFile = `${RAML_DIR}/machines-non_required_query_parameter.raml`;
        raml2obj.parse(ramlFile)
          .then(function(raml) {
            callback = sinon.stub();
            callback.returns(done());

            return addTests(raml, tests, hooks, callback, testFactory, false);}).catch(function(err) {
            console.error(err);
            return done(err);
        });
      });

      after(() => tests = []);

      it('should run callback', () => assert.ok(callback.called));

      it('should add 1 test', () => assert.lengthOf(tests, 1));

      return it('should not append query parameters', () => assert.deepEqual(tests[0].request.query, {}));
  });
});
});


function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}