/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/**
 * @file Abao class
 */

require('source-map-support').install({handleUncaughtExceptions: false});
const async = require('async');
const raml2obj = require('raml2obj');
const fs = require('fs');
const path = require("path");
const addHooks = require('./add-hooks');
const addTests = require('./add-tests');
const TestFactory = require('./test');
const asConfiguration = require('./configuration');
let hooks = require('./hooks');
const Runner = require('./test-runner');
const wap = require('webapi-parser').WebApiParser;

const defaultArgs = {
  _: [],
  options: {
    help: true
  }
};

// Patch provided types files to suit webapi-parser
const patchRamlTypes = function(typeFilePath) {
  // Read provided raml types file
  let types = null;
  try {
    types = fs.readFileSync(typeFilePath).toString();
  } catch (err) {
    throw Error(`Failed to read provided types file: ${err}`);
  }

  // Patch file
  let dataPieces = types.split('\n');
  const newStrings = [];
  for (let index = 0; index < dataPieces.length; index++) {
    // Indent type definition (will be nested under 'types')
    var dP = dataPieces[index];
    dataPieces[index] = `  ${dP}`;
    var dataType = dP.match(/^(\w.*):/g);
    if (!dataType) {
      continue;
    }

    // Add RAML API entry for datatype (required for webapi-parser)
    dataType = dataType[0].replace(':', '');
    newStrings.push(`\
/for/conversion/${dataType}:
  get:
    responses:
      200:
        body:
          application/json:
            type: ${dataType}`);
  }
  
  // Combine modified and new entries
  dataPieces[0] = `#%RAML 1.0
types:`;
  dataPieces = dataPieces.concat(newStrings);

  return dataPieces.join('\n');
};


class Abao {
  constructor(parsedArgs) {
    if (parsedArgs == null) { parsedArgs = defaultArgs; }
    'use strict';
    this.configuration = asConfiguration(parsedArgs);
    this.tests = [];
    this.hooks = hooks;
  }

  run(done) {
    'use strict';
    const config = this.configuration;
    const {
      tests
    } = this;
    ({
      hooks
    } = this);

    // Inject the JSON refs schemas
    const factory = this.factory = new TestFactory(config);

    const parseHooks = function(callback) {
      addHooks(hooks, config.options.hookfiles, factory, callback);
       // NOTREACHED
    };

    const loadRAML = function(callback) {
      if (!config.ramlPath) {
        const nofile = new Error('unspecified RAML file');
        return callback(nofile);
      }

      raml2obj.parse(config.ramlPath)
        .then(function(raml) {
          raml.ramlPath = path.dirname(config.ramlPath);
          raml.ramlData = fs.readFileSync(config.ramlPath).toString();
          
          // Skip generating webapi model if not required
          if (!config.options.typesfile) {
            console.log('Using ramldt2jsonschema (v0.3.1) for RAML parsing');
            return callback(null, raml);
          }
          
          // Use provided types RAML file to generate a webapi model (for generating datatype schemas)
          console.log(`\
Using WebApi-Parser for RAML parsing:
  - Types file should not be a library or have a types node
  - All datatype fragments *MUST* have a fragment identifier ("#%RAML 1.0 DataType")
  - RAML should not have duplicate definitions (e.g. multiple examples for the same type)`
          );
          const patchedRamlTypes = patchRamlTypes(config.options.typesfile);
          const location = `file://${path.resolve(process.cwd(), config.options.typesfile)}`;
          return wap.raml10.parse(patchedRamlTypes, location)
          .then(model => wap.raml10.resolve(model)
          .then(function(resolved) {
            raml.webApiModel = resolved;
            return callback(null, raml);
          }));}).catch(err => callback(err));
       // NOTREACHED
    };

    const parseTestsFromRAML = function(raml, callback) {
      if (!config.options.server) {
        if (raml.baseUri) {
          config.options.server = raml.baseUri;
        }
      }

      try {
        addTests(raml, tests, hooks, {}, callback, factory, config.options.sorted);
      } catch (err) {
        console.warn('error adding tests ' + err);
      }
       // NOTREACHED
    };

    const runTests = function(callback) {
      const runner = new Runner(config.options, config.ramlPath);
      //console.log JSON.stringify tests, null, 2
      try {
        runner.run(tests, hooks, callback);
      } catch (error) {
        console.log('error running tests ' + error);
      }
       // NOTREACHED
    };

    async.waterfall([
      parseHooks,
      loadRAML,
      parseTestsFromRAML,
      runTests
    ], done);
  }
}



module.exports = Abao;

