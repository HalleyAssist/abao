/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const {after} = require('hooks');

after('GET /machines -> 200', function(test, done) {
  'use strict';
  console.error('after-hook-GET-machines');
  return done();
});

