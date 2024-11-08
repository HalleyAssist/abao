/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS203: Remove `|| {}` from converted for-own loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/**
 * @file Stores command line arguments in configuration object
 */

const _ = require('lodash');
const path = require('path');

const abaoOptions = require('./options-abao');
const mochaOptions = require('./options-mocha');
const allOptions = _.assign({}, abaoOptions, mochaOptions);


const applyConfiguration = function(config) {
  'use strict';

  const coerceToArray = function(value) {
    if (typeof value === 'string') {
      value = [value];
    } else if ((value == null)) {
      value = [];
    } else if (value instanceof Array) {
      value;
    } else { value; }
    return value;
  };

  const coerceToDict = function(value) {
    const array = coerceToArray(value);
    const dict = {};

    if (array.length > 0) {
      for (var item of Array.from(array)) {
        var key;
        [key, value] = Array.from(item.split(':'));
        dict[key] = value;
      }
    }

    return dict;
  };

  const configuration = {
    ramlPath: null,
    options: {
      server: null,
      schemas: null,
      'generate-hooks': false,
      template: null,
      timeout: 2000,
      reporter: null,
      header: null,
      names: false,
      hookfiles: null,
      typesfile: null,
      grep: '',
      invert: false,
      'hooks-only': false,
      sorted: false
    }
  };

  // Normalize options and config
  for (var key of Object.keys(config || {})) {
    var value = config[key];
    configuration[key] = value;
  }

  // Customize
  if (!configuration.options.template) {
    const defaultTemplate = path.join('templates', 'hookfile.js');
    configuration.options.template = defaultTemplate;
  }
  configuration.options.header = coerceToDict(configuration.options.header);

  // TODO(quanlong): OAuth2 Bearer Token
  if (configuration.options.oauth2Token != null) {
    configuration.options.headers['Authorization'] = `Bearer ${configuration.options.oauth2Token}`;
  }

  return configuration;
};

// Create configuration settings from CLI arguments applied against options
// @param {Object} parsedArgs - yargs .argv() output
// @returns {Object} configuration object
const asConfiguration = function(parsedArgs) {
  'use strict';
  //# TODO(plroebuck): Do all configuration in one place...
  const aliases = Object.keys(allOptions).map(key => allOptions[key].alias)
              .filter(val => val !== undefined);
  const alreadyHandled = [
    'reporters',
    'help',
    'version'
  ];

  const configuration = {
    ramlPath: parsedArgs._[0],
    options: _.omit(parsedArgs, ['_', '$0', ...Array.from(aliases), ...Array.from(alreadyHandled)])
  };

  const mochaOptionNames = Object.keys(mochaOptions);
  const optionsToReparent = _.pick(configuration.options, mochaOptionNames);
  configuration.options = _.omit(configuration.options, mochaOptionNames);
  configuration.options.mocha = optionsToReparent;

  return applyConfiguration(configuration);
};


module.exports = asConfiguration;

