/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/**
 * @file TestRunner class
 */

const async = require('async');
const Mocha = require('mocha');
const path = require('path');
// TODO(proebuck): Replace underscore module with Lodash; ensure compatibility
const _ = require('underscore');

const generateHooks = require('./generate-hooks');


class TestRunner {
  constructor(options, ramlFile) {
    this.addTestToMocha = this.addTestToMocha.bind(this);
    'use strict';
    this.server = options.server;
    delete options.server;
    this.mocha = new Mocha(options.mocha);
    delete options.mocha;
    this.options = options;
    this.ramlFile = ramlFile;
  }

  addTestToMocha(test, hooks) {
    'use strict';
    const {
      mocha
    } = this;
    const {
      options
    } = this;

    // Generate Test Suite
    const suite = Mocha.Suite.create(mocha.suite, test.name);

    // No Response defined
    if (!test.response.status) {
      suite.addTest(new Mocha.Test('Skip as no response code defined'));
      return;
    }

    // No Hooks for this test
    if (!hooks.hasName(test.name) && options['hooks-only']) {
      suite.addTest(new Mocha.Test('Skip as no hooks defined'));
      return;
    }

    // Test skipped in hook file
    if (hooks.skipped(test.name)) {
      suite.addTest(new Mocha.Test('Skipped in hooks'));
      return;
    }

    // Setup hooks
    if (hooks) {
      suite.beforeAll(function(done) {
        hooks.runBefore(test, done);
      });

      suite.afterAll(function(done) {
        hooks.runAfter(test, done);
      } );
    }

    // Setup test
    // Vote test name
    const title = test.response.schema ?
              'Validate response code and body'
            :
              'Validate response code only';
    return suite.addTest(new Mocha.Test(title, function(done) {
      test.run(done);
    }
    ));
  }

  run(tests, hooks, done) {
    'use strict';
    const {
      server
    } = this;
    const {
      options
    } = this;
    const {
      addTestToMocha
    } = this;
    const {
      mocha
    } = this;
    const ramlFile = path.basename(this.ramlFile);
    const names = [];

    return async.waterfall([
      callback => async.each(tests, function(test, cb) {
        if (options.names || options['generate-hooks']) {
          // Save test names for use by next step
          names.push(test.name);
          return cb();
        }

        // None shall pass without...
        if (!server) { return callback(new Error('no API endpoint specified')); }

        // Update test.request
        test.request.server = server;
        _.extend(test.request.headers, options.header);

        addTestToMocha(test, hooks);
        return cb();
      }
      , callback)
      , // Handle options that don't run tests
      function(callback) {
        if (options['generate-hooks']) {
          // Generate hooks skeleton file
          return generateHooks(names, ramlFile, options.template, done);
        } else if (options.names) {
          // Write names to console
          for (var name of Array.from(names)) { console.log(name); }
          return done(null, 0);
        } else {
          return callback();
        }
      }
      , // Run mocha
      function(callback) {
        mocha.suite.beforeAll((done) => {
          hooks.runBeforeAll(done);
        });
        mocha.suite.afterAll((done) => {
          hooks.runAfterAll(done);
        });

        mocha.run(failures => callback(null, failures));
      }
    ], done);
  }
}



module.exports = TestRunner;

