/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/**
 * @file Load user hooks
 */

const glob = require('glob');
const path = require('path');
const proxyquire = require('proxyquire').noCallThru();


const addHooks = function(hooks, pattern, factory, callback) {
  'use strict';
  if (pattern) {
    const files = glob.sync(pattern);

    if (files.length === 0) {
      const nomatch = new Error(`no hook files found matching pattern '${pattern}'`);
      return callback(nomatch);
    }

    console.info('processing hook file(s):');
    try {
      files.map(function(file) {
        const absFile = path.resolve(process.cwd(), file);
        console.info(`  ${absFile}`);
        return proxyquire(absFile, {
          'hooks': hooks,
          'factory': factory
        });});
      console.log();
    } catch (error) {
      console.error('error loading hooks...');
      return callback(error);
    }
  }

  return callback(null);
};


module.exports = addHooks;

