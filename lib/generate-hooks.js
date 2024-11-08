/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/**
 * @file Generates hooks stub file
 */

const fs = require('fs');
const Mustache = require('mustache');

const generateHooks = function(names, ramlFile, templateFile, callback) {
  'use strict';
  if (!names) {
    callback(new Error('no names found for which to generate hooks'));
  }

  if (!templateFile) {
    callback(new Error('missing template file'));
  }

  try {
    const template = fs.readFileSync(templateFile, 'utf8');
    const datetime = new Date().toISOString().replace('T', ' ').substr(0, 19);
    const view = {
      ramlFile,
      timestamp: datetime,
      hooks:
        (Array.from(names).map((name) => ({'name': name})))
    };
    view.hooks[0].comment = true;

    const content = Mustache.render(template, view);
    console.log(content);
  } catch (error) {
    console.error('failed to generate skeleton hooks');
    callback(error);
  }

  return callback;
};

module.exports = generateHooks;

