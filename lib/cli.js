/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/**
 * @file Command line interface
 */


const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const yargs = require('yargs');

const Abao = require('./abao');
const abaoOptions = require('./options-abao');
const mochaOptions = require('./options-mocha');
const pkg = require('../package');

const EXIT_SUCCESS = 0;
const EXIT_FAILURE = 1;

const showReporters = function() {
  'use strict';
  const mochaDir = path.dirname(require.resolve('mocha'));
  const mochaPkg = require('mocha/package');
  let executable = path.join(mochaDir, mochaPkg.bin._mocha);
  executable = path.normalize(executable);
  const stdout = child_process.execFileSync(executable, ['--reporters']);
  fs.writeSync(1, stdout.toString());
};

const parseArgs = function(argv) {
  'use strict';
  const allOptions = _.assign({}, abaoOptions, mochaOptions);
  const mochaOptionNames = Object.keys(mochaOptions);
  const prog = path.basename(pkg.bin.abao);
  return yargs(argv)
    .usage(`Usage:\n  ${prog} </path/to/raml> [OPTIONS]` +
      `\n\nExample:\n  ${prog} api.raml --server http://api.example.com`)
    .options(allOptions)
    .group(mochaOptionNames, 'Options passed to Mocha:')
    .implies('template', 'generate-hooks')
    .check(function(argv) {
      if (argv.reporters === true) {
        showReporters();
        process.exit(EXIT_SUCCESS);
      }

      // Ensure single positional argument present
      if (argv._.length < 1) {
        throw new Error(`${prog}: must specify path to RAML file`);
      } else if (argv._.length > 1) {
        throw new Error(`${prog}: accepts single positional command-line argument`);
      }

      return true;
    })
    .wrap(80)
    .help('help', 'Show usage information and exit')
    .version('version', 'Show version number and exit', pkg.version)
    .epilog(`Website:\n  ${pkg.homepage}`)
    .argv;
};

//#
//# Main
//#
const main = function(argv) {
  'use strict';
  const parsedArgs = parseArgs(argv);

  const abao = new Abao(parsedArgs);
  abao.run(function(error, nfailures) {
    if (error) {
      process.exitCode = EXIT_FAILURE;
      if (error.message) {
        console.error(error.message);
      }
      if (error.stack) {
        console.error(error.stack);
      }
    }

    if (nfailures > 0) {
      process.exitCode = EXIT_FAILURE;
    }

    return process.exit();
  });
   // NOTREACHED
};


module.exports =
  {main, parseArgs};

