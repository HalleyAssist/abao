/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/**
 * @file Hooks class
 */

const async = require('async');
const _ = require('lodash');


class Hooks {
  constructor() {
    this.before = this.before.bind(this);
    this.after = this.after.bind(this);
    this.beforeAll = this.beforeAll.bind(this);
    this.afterAll = this.afterAll.bind(this);
    this.beforeEach = this.beforeEach.bind(this);
    this.afterEach = this.afterEach.bind(this);
    this.test = this.test.bind(this);
    this.runBeforeAll = this.runBeforeAll.bind(this);
    this.runAfterAll = this.runAfterAll.bind(this);
    this.runBefore = this.runBefore.bind(this);
    this.runAfter = this.runAfter.bind(this);
    this.skip = this.skip.bind(this);
    this.hasName = this.hasName.bind(this);
    this.skipped = this.skipped.bind(this);
    'use strict';
    this.beforeHooks = {};
    this.afterHooks = {};
    this.beforeAllHooks = [];
    this.afterAllHooks = [];
    this.beforeEachHooks = [];
    this.afterEachHooks = [];
    this.contentTests = {};
    this.skippedTests = [];
  }

  before(name, hook) {
    'use strict';
    return this.addHook(this.beforeHooks, name, hook);
  }

  after(name, hook) {
    'use strict';
    return this.addHook(this.afterHooks, name, hook);
  }

  beforeAll(hook) {
    'use strict';
    return this.beforeAllHooks.push(hook);
  }

  afterAll(hook) {
    'use strict';
    return this.afterAllHooks.push(hook);
  }

  beforeEach(hook) {
    'use strict';
    return this.beforeEachHooks.push(hook);
  }

  afterEach(hook) {
    'use strict';
    return this.afterEachHooks.push(hook);
  }

  addHook(hooks, name, hook) {
    'use strict';
    if (hooks[name]) {
      return hooks[name].push(hook);
    } else {
      return hooks[name] = [hook];
    }
  }

  test(name, hook) {
    'use strict';
    if (this.contentTests[name] != null) {
      throw new Error(`cannot have more than one test with the name: ${name}`);
    }
    return this.contentTests[name] = hook;
  }

  runBeforeAll(callback) {
    'use strict';
    return async.series(this.beforeAllHooks, (err, results) => callback(err));
  }

  runAfterAll(callback) {
    'use strict';
    return async.series(this.afterAllHooks, (err, results) => callback(err));
  }

  runBefore(test, callback) {
    'use strict';
    if (!this.beforeHooks[test.name] && !this.beforeEachHooks) { return callback(); }

    const hooks = this.beforeEachHooks.concat(this.beforeHooks[test.name] != null ? this.beforeHooks[test.name] : []);
    return async.eachSeries(hooks, (hook, callback) => hook(test, callback)
    , callback);
  }

  runAfter(test, callback) {
    'use strict';
    if (!this.afterHooks[test.name] && !this.afterEachHooks) { return callback(); }

    const hooks = (this.afterHooks[test.name] != null ? this.afterHooks[test.name] : []).concat(this.afterEachHooks);
    return async.eachSeries(hooks, (hook, callback) => hook(test, callback)
    , callback);
  }

  skip(name) {
    'use strict';
    return this.skippedTests.push(name);
  }

  hasName(name) {
    'use strict';
    return _.has(this.beforeHooks, name) || _.has(this.afterHooks, name);
  }

  skipped(name) {
    'use strict';
    return this.skippedTests.indexOf(name) !== -1;
  }
}



module.exports = new Hooks();

