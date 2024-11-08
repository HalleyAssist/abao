/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const chai = require('chai');
const child_process = require('child_process');
const express = require('express');
const _ = require('lodash');
const os = require('os');
const pkg = require('../../package');

const {
  expect
} = chai;

const HOSTNAME = 'localhost';
const PORT = 3333;
const SERVER = `http://${HOSTNAME}:${PORT}`;

const TEMPLATE_DIR = './templates';
const DFLT_TEMPLATE_FILE = `${TEMPLATE_DIR}/hooks.js`;
const FIXTURE_DIR = './test/fixtures';
const RAML_DIR = `${FIXTURE_DIR}`;
const HOOK_DIR = `${FIXTURE_DIR}`;
const SCHEMA_DIR = `${FIXTURE_DIR}/schemas`;

const CMD_PREFIX = '';
const ABAO_BIN = './bin/abao';
const MOCHA_BIN = './node_modules/mocha/bin/mocha';

const mochaJsonReportKeys = [
  'stats',
  'tests',
  'pending',
  'failures',
  'passes'
];

let stderr = undefined;
let stdout = undefined;
let report = undefined;
let exitStatus = undefined;

//
// To dump individual raw test results:
//
// describe('show me the results', () ->
//   runTestAsync = (done) ->
//     cmd = "#{ABAO_BIN}"
//     execCommand cmd, done
//   before (done) ->
//     debugExecCommand = true
//     runTestAsync done
//   after () ->
//     debugExecCommand = false
//
const debugExecCommand = false;


const execCommand = function(cmd, callback) {
  'use strict';

  stderr = '';
  stdout = '';
  report = '';
  exitStatus = null;

  const cli = child_process.exec(CMD_PREFIX + cmd, function(error, out, err) {
    stdout = out;
    stderr = err;
    try {
      report = JSON.parse(out);
    } catch (ignore) {}
      // Ignore issues with creating report from output
  });

  cli.on('exit', function(code, signal) {
    if (code !== null) {
      exitStatus = code;
    } else {
      exitStatus = 128 + os.constants.signals[signal];
    }
  });

  return cli.on('close', function(code, signal) {
    if (debugExecCommand) {
      console.log(`stdout:\n${stdout}\n`);
      console.log(`stderr:\n${stderr}\n`);
      console.log(`report:\n${report}\n`);
      console.log(`exitStatus = ${exitStatus}\n`);
    }
    return callback(null);
  });
};


describe('Command line interface', function() {
  'use strict';

  describe('when run without any arguments', function(done) {

    const runNoArgTestAsync = function(done) {
      const cmd = `${ABAO_BIN}`;

      return execCommand(cmd, done);
    };

    before(done => runNoArgTestAsync(done));

    it('should print usage to stderr', function() {
      const firstLine = stderr.split('\n')[0];
      return expect(firstLine).to.equal('Usage:');
    });

    it('should print error message to stderr', () => expect(stderr).to.include('must specify path to RAML file'));

    return it('should exit due to error', () => expect(exitStatus).to.equal(1));
  });


  describe('when run with multiple positional arguments', function(done) {

    const runTooManyArgTestAsync = function(done) {
      const ramlFile = `${RAML_DIR}/machines-single_get.raml`;
      const cmd = `${ABAO_BIN} ${ramlFile} ${ramlFile}`;

      return execCommand(cmd, done);
    };

    before(done => runTooManyArgTestAsync(done));

    it('should print usage to stderr', function() {
      const firstLine = stderr.split('\n')[0];
      return expect(firstLine).to.equal('Usage:');
    });

    it('should print error message to stderr', () => expect(stderr).to.include('accepts single positional command-line argument'));

    return it('should exit due to error', () => expect(exitStatus).to.equal(1));
  });


  describe('when run with one-and-done options', function(done) {

    describe('when RAML argument unnecessary', function() {

      describe('when invoked with "--reporters" option', function() {

        let reporters = '';

        const runReportersTestAsync = done => execCommand(`${MOCHA_BIN} --reporters`, function() {
          reporters = stdout;
          return execCommand(`${ABAO_BIN} --reporters`, done);
        });

        before(done => runReportersTestAsync(done));

        it('should print same output as `mocha --reporters`', () => expect(stdout).to.equal(reporters));

        return it('should exit normally', () => expect(exitStatus).to.equal(0));
      });


      describe('when invoked with "--version" option', function() {

        const runVersionTestAsync = function(done) {
          const cmd = `${ABAO_BIN} --version`;

          return execCommand(cmd, done);
        };

        before(done => runVersionTestAsync(done));

        it('should print version number to stdout', () => expect(stdout.trim()).to.equal(pkg.version));

        return it('should exit normally', () => expect(exitStatus).to.equal(0));
      });


      return describe('when invoked with "--help" option', function() {

        const runHelpTestAsync = function(done) {
          const cmd = `${ABAO_BIN} --help`;

          return execCommand(cmd, done);
        };

        before(done => runHelpTestAsync(done));

        it('should print usage to stdout', function() {
          const firstLine = stdout.split('\n')[0];
          return expect(firstLine).to.equal('Usage:');
        });

        return it('should exit normally', () => expect(exitStatus).to.equal(0));
      });
    });


    return describe('when RAML argument required', function() {

      describe('when invoked with "--names" option', function() {

        const runNamesTestAsync = function(done) {
          const ramlFile = `${RAML_DIR}/machines-single_get.raml`;
          const cmd = `${ABAO_BIN} ${ramlFile} --names`;

          return execCommand(cmd, done);
        };

        before(done => runNamesTestAsync(done));

        it('should print names', () => expect(stdout).to.include('GET /machines -> 200'));

        it('should not run tests', () => expect(stdout).to.not.include('0 passing'));

        return it('should exit normally', () => expect(exitStatus).to.equal(0));
      });


      describe('when invoked with "--generate-hooks" option', function() {

        describe('by itself (use package-provided template)', function() {

          const runGenHooksTestAsync = function(done) {
            const ramlFile = `${RAML_DIR}/machines-single_get.raml`;
            const cmd = `${ABAO_BIN} ${ramlFile} --generate-hooks`;

            return execCommand(cmd, done);
          };

          before(done => runGenHooksTestAsync(done));

          it('should print skeleton hookfile', () => expect(stdout).to.include('// ABAO hooks file'));

          it('should not run tests', () => expect(stdout).to.not.include('0 passing'));

          return it('should exit normally', () => expect(exitStatus).to.equal(0));
        });


        return describe('with "--template" option', function() {

          const runGenHookTemplateTestAsync = function(done) {
            const templateFile = `${TEMPLATE_DIR}/hookfile.js`;
            const ramlFile = `${RAML_DIR}/machines-single_get.raml`;
            const cmd = `${ABAO_BIN} ${ramlFile} --generate-hooks --template ${templateFile}`;

            return execCommand(cmd, done);
          };

          before(done => runGenHookTemplateTestAsync(done));

          it('should print skeleton hookfile', () => expect(stdout).to.include('// ABAO hooks file'));

          it('should not run tests', () => expect(stdout).to.not.include('0 passing'));

          return it('should exit normally', () => expect(exitStatus).to.equal(0));
        });
      });


      return describe('when invoked with "--template" but without "--generate-hooks" option', function() {

        const runTemplateOnlyTestAsync = function(done) {
          const templateFile = `${TEMPLATE_DIR}/hookfile.js`;
          const ramlFile = `${RAML_DIR}/machines-single_get.raml`;
          const cmd = `${ABAO_BIN} ${ramlFile} --template ${templateFile}`;

          return execCommand(cmd, done);
        };

        before(done => runTemplateOnlyTestAsync(done));

        it('should print error message to stderr', function() {
          expect(stderr).to.include('Implications failed:');
          return expect(stderr).to.include('template -> generate-hooks');
        });

        return it('should exit due to error', () => expect(exitStatus).to.equal(1));
      });
    });
  });


  describe('when RAML file not found', function(done) {

    const runNoRamlTestAsync = function(done) {
      const ramlFile = `${RAML_DIR}/nonexistent_path.raml`;
      const cmd = `${ABAO_BIN} ${ramlFile} --server ${SERVER}`;

      return execCommand(cmd, done);
    };

    before(done => runNoRamlTestAsync(done));

    it('should print error message to stderr', () => // See https://travis-ci.org/cybertk/abao/jobs/76656192#L479
    // iojs behaviour is different from nodejs
    expect(stderr).to.include('Error: ENOENT'));

    return it('should exit due to error', () => expect(exitStatus).to.equal(1));
  });


  return describe('arguments with existing RAML and responding server', function() {

    describe('when invoked without "--server" option', function() {

      describe('when RAML file does not specify "baseUri"', function() {

        const runUnspecifiedServerTestAsync = function(done) {
          const ramlFile = `${RAML_DIR}/music-no_base_uri.raml`;
          const cmd = `${ABAO_BIN} ${ramlFile} --reporter json`;

          return execCommand(cmd, done);
        };

        before(done => runUnspecifiedServerTestAsync(done));

        it('should print error message to stderr', () => expect(stderr).to.include('no API endpoint specified'));

        return it('should exit due to error', () => expect(exitStatus).to.equal(1));
      });


      return describe('when RAML file specifies "baseUri"', function() {

        const resTestTitle = 'GET /machines -> 200 Validate response code and body';

        const runBaseUriServerTestAsync = function(done) {
          const ramlFile = `${RAML_DIR}/machines-single_get.raml`;
          const cmd = `${ABAO_BIN} ${ramlFile} --reporter json`;

          const app = express();

          app.get('/machines', function(req, res) {
            const machine = {
              type: 'bulldozer',
              name: 'willy'
            };
            return res.status(200).json([machine]);
          });

          var server = app.listen(PORT, () => execCommand(cmd, () => server.close()));

          return server.on('close', done);
        };

        before(done => runBaseUriServerTestAsync(done));

        it('should print count of tests run', function() {
          expect(report).to.exist;
          expect(report).to.have.all.keys(mochaJsonReportKeys);
          expect(report.stats.tests).to.equal(1);
          return expect(report.stats.passes).to.equal(1);
        });

        it('should print correct title for response', function() {
          expect(report.tests).to.have.length(1);
          return expect(report.tests[0].fullTitle).to.equal(resTestTitle);
        });

        return it('should exit normally', () => expect(exitStatus).to.equal(0));
      });
    });


    describe('when executing the command and the server is responding as specified in the RAML', function() {

      const responses = {};
      let getResponse = undefined;
      let headResponse = undefined;
      let optionsResponse = undefined;

      const getTestTitle = 'GET /machines -> 200 Validate response code and body';
      const headTestTitle = 'HEAD /machines -> 200 Validate response code only';
      const optionsTestTitle = 'OPTIONS /machines -> 204 Validate response code only';

      const runNormalTestAsync = function(done) {
        const ramlFile = `${RAML_DIR}/machines-get_head_options.raml`;
        const cmd = `${ABAO_BIN} ${ramlFile} --server ${SERVER} --reporter json`;

        const app = express();

        app.use(function(req, res, next) {
          const origResWrite = res.write;
          const origResEnd = res.end;
          const chunks = [];
          res.write = function(chunk) {
            chunks.push(new Buffer(chunk));
            return origResWrite.apply(res, arguments);
          };
          res.end = function(chunk) {
            if (chunk) {
              chunks.push(new Buffer(chunk));
            }
            res.body = Buffer.concat(chunks).toString('utf8');
            return origResEnd.apply(res, arguments);
          };
          return next();
        });

        app.options('/machines', function(req, res, next) {
          const allow = ['OPTIONS', 'HEAD', 'GET'];
          const directives = ['no-cache', 'no-store', 'must-revalidate'];
          res.setHeader('Allow', allow.join(','));
          res.setHeader('Cache-Control', directives.join(','));
          res.setHeader('Pragma', directives[0]);
          res.setHeader('Expires', '0');
          res.status(204).end();
          return next();
        });

        app.get('/machines', function(req, res, next) {
          const machine = {
            type: 'bulldozer',
            name: 'willy'
          };
          res.status(200).json([machine]);
          return next();
        });

        app.use(function(req, res, next) {
          const response = {
            headers: {},
            body: res.body
          };
          const headerNames = (function() {
            if (req.method === 'OPTIONS') {
              return [
                'Allow',
                'Cache-Control',
                'Expires',
                'Pragma'
              ];
            } else {
              return [
                'Content-Type',
                'Content-Length',
                'ETag'
              ];
            }
          })();
          headerNames.forEach(headerName => response.headers[headerName] = res.get(headerName));
          return responses[req.method] = _.cloneDeep(response);
        });

        var server = app.listen(PORT, () => execCommand(cmd, () => server.close()));

        return server.on('close', done);
      };

      before(done => runNormalTestAsync(done));

      before(function() {
        getResponse = responses['GET'];
        headResponse = responses['HEAD'];
        return optionsResponse = responses['OPTIONS'];});

      it('should provide count of tests run', function() {
        expect(report).to.exist;
        expect(report).to.have.all.keys(mochaJsonReportKeys);
        return expect(report.stats.tests).to.equal(3);
      });

      it('should provide count of tests passing', () => expect(report.stats.passes).to.equal(3));

      it('should print correct title for each response', function() {
        expect(report.tests).to.have.length(3);
        expect(report.tests[0].fullTitle).to.equal(getTestTitle);
        expect(report.tests[1].fullTitle).to.equal(headTestTitle);
        return expect(report.tests[2].fullTitle).to.equal(optionsTestTitle);
      });

      it('OPTIONS response should allow GET and HEAD requests', function() {
        const allow = optionsResponse.headers['Allow'];
        return expect(allow).to.equal('OPTIONS,HEAD,GET');
      });

      it('OPTIONS response should disable caching of it', function() {
        const cacheControl = optionsResponse.headers['Cache-Control'];
        expect(cacheControl).to.equal('no-cache,no-store,must-revalidate');
        const pragma = optionsResponse.headers['Pragma'];
        expect(pragma).to.equal('no-cache');
        const expires = optionsResponse.headers['Expires'];
        return expect(expires).to.equal('0');
      });

      it('OPTIONS and HEAD responses should not have bodies', function() {
        expect(optionsResponse.body).to.be.empty;
        return expect(headResponse.body).to.be.empty;
      });

      it('GET and HEAD responses should have equivalent headers', () => expect(getResponse.headers).to.deep.equal(headResponse.headers));

      return it('should exit normally', () => expect(exitStatus).to.equal(0));
    });


    describe('when executing the command and RAML includes other RAML files', function() {

      const runRamlIncludesTestAsync = function(done) {
        const ramlFile = `${RAML_DIR}/machines-include_other_raml.raml`;
        const cmd = `${ABAO_BIN} ${ramlFile} --server ${SERVER}`;

        const app = express();

        app.get('/machines', function(req, res) {
          const machine = {
            type: 'bulldozer',
            name: 'willy'
          };
          return res.status(200).json([machine]);
        });

        var server = app.listen(PORT, () => execCommand(cmd, () => server.close()));

        return server.on('close', done);
      };

      before(done => runRamlIncludesTestAsync(done));

      it('should print count of passing tests run', () => expect(stdout).to.have.string('1 passing'));

      return it('should exit normally', () => expect(exitStatus).to.equal(0));
    });


    return describe('when called with arguments', function() {

      describe('when invoked with "--reporter" option', function() {

        const runReporterTestAsync = function(done) {
          const ramlFile = `${RAML_DIR}/machines-single_get.raml`;
          const cmd = `${ABAO_BIN} ${ramlFile} --server ${SERVER} --reporter spec`;

          const app = express();

          app.get('/machines', function(req, res) {
            const machine = {
              type: 'bulldozer',
              name: 'willy'
            };
            return res.status(200).json([machine]);
          });

          var server = app.listen(PORT, () => execCommand(cmd, () => server.close()));

          return server.on('close', done);
        };

        before(done => runReporterTestAsync(done));

        it('should print using the specified reporter', () => expect(stdout).to.have.string('1 passing'));

        return it('should exit normally', () => expect(exitStatus).to.equal(0));
      });


      describe('when invoked with "--header" option', function() {

        let receivedRequest = {};
        const producedMediaType = 'application/vnd.api+json';
        let reqMediaType = undefined;
        let extraHeader = undefined;

        return describe('with "Accept" header', function() {

          const runAcceptHeaderTestAsync = function(done) {
            extraHeader = `Accept:${reqMediaType}`;
            const ramlFile = `${RAML_DIR}/machines-single_get.raml`;
            const cmd = `${ABAO_BIN} ${ramlFile} --server ${SERVER} --header ${extraHeader}`;

            const app = express();

            app.use(function(req, res, next) {
              receivedRequest = req;
              return next();
            });

            app.use(function(req, res, next) {
              let err = null;
              if (!req.accepts([`${producedMediaType}`])) {
                err = new Error('Not Acceptable');
                err.status = 406;
              }
              return next(err);
            });

            app.get('/machines', function(req, res) {
              const machine = {
                type: 'bulldozer',
                name: 'willy'
              };
              res.type(`${producedMediaType}`);
              return res.status(200).send([machine]);
            });

            app.use(function(err, req, res, next) {
              res.status(err.status || 500)
                .json({
                  message: err.message,
                  stack: err.stack
                });
            });

            var server = app.listen(PORT, () => execCommand(cmd, () => server.close()));

            return server.on('close', done);
          };

          context('when expecting success', function() {

            before(function(done) {
              reqMediaType = `${producedMediaType}`;
              return runAcceptHeaderTestAsync(done);
            });

            it('should have the additional header in the request', () => expect(receivedRequest.headers.accept).to.equal(`${reqMediaType}`));

            it('should print count of passing tests run', () => expect(stdout).to.have.string('1 passing'));

            return it('should exit normally', () => expect(exitStatus).to.equal(0));
          });


          return context('when expecting failure', function() {

            before(function(done) {
              reqMediaType = 'application/json';
              return runAcceptHeaderTestAsync(done);
            });

            it('should have the additional header in the request', () => expect(receivedRequest.headers.accept).to.equal(`${reqMediaType}`));

            // Errors thrown by Mocha show up in stdout; those by Abao in stderr.
            it('Mocha should throw an error', function() {
              const detail = 'Error: unexpected response code: actual=406, expected=200';
              return expect(stdout).to.have.string(detail);
            });

            it('should run test but not complete', () => expect(stdout).to.have.string('1 failing'));

            return it('should exit due to error', () => expect(exitStatus).to.equal(1));
          });
        });
      });


      describe('when invoked with "--hookfiles" option', function() {

        let receivedRequest = {};

        const runHookfilesTestAsync = function(done) {
          const pattern = `${HOOK_DIR}/*_hooks.*`;
          const ramlFile = `${RAML_DIR}/machines-single_get.raml`;
          const cmd = `${ABAO_BIN} ${ramlFile} --server ${SERVER} --hookfiles=${pattern}`;

          const app = express();

          app.use(function(req, res, next) {
            receivedRequest = req;
            return next();
          });

          app.get('/machines', function(req, res) {
            const machine = {
              type: 'bulldozer',
              name: 'willy'
            };
            return res.status(200).json([machine]);
          });

          var server = app.listen(PORT, () => execCommand(cmd, () => server.close()));

          return server.on('close', done);
        };

        before(done => runHookfilesTestAsync(done));

        it('should modify the transaction with hooks', function() {
          expect(receivedRequest.headers['header']).to.equal('123232323');
          return expect(receivedRequest.query['key']).to.equal('value');
        });

        it('should print message to stdout and stderr', function() {
          expect(stdout).to.include('before-hook-GET-machines');
          return expect(stderr).to.include('after-hook-GET-machines');
        });

        return it('should exit normally', () => expect(exitStatus).to.equal(0));
      });


      describe('when invoked with "--hooks-only" option', function() {

        const runHooksOnlyTestAsync = function(done) {
          const ramlFile = `${RAML_DIR}/machines-single_get.raml`;
          const cmd = `${ABAO_BIN} ${ramlFile} --server ${SERVER} --hooks-only`;

          const app = express();

          app.get('/machines', function(req, res) {
            const machine = {
              type: 'bulldozer',
              name: 'willy'
            };
            return res.status(200).json([machine]);
          });

          var server = app.listen(PORT, () => execCommand(cmd, () => server.close()));

          return server.on('close', done);
        };

        before(done => runHooksOnlyTestAsync(done));

        it('should not run test without hooks', () => expect(stdout).to.have.string('1 pending'));

        return it('should exit normally', () => expect(exitStatus).to.equal(0));
      });


      describe('when invoked with "--timeout" option', function() {

        let timeout = undefined;
        let elapsed = -1;
        let finished = undefined;

        const runTimeoutTestAsync = function(done) {
          const ramlFile = `${RAML_DIR}/machines-single_get.raml`;
          const cmd = `${ABAO_BIN} ${ramlFile} --server ${SERVER} --timeout ${timeout}`;

          let beginTime = undefined;
          finished = false;

          const app = express();

          app.use(function(req, res, next) {
            beginTime = new Date();
            res.on('finish', () => finished = true);
            return next();
          });

          app.use(function(req, res, next) {
            const delay = timeout * 2;
            return setTimeout(next, delay);
          });

          app.get('/machines', function(req, res) {
            const machine = {
              type: 'bulldozer',
              name: 'willy'
            };
            return res.status(200).json([machine]);
          });

          var server = app.listen(PORT, () => execCommand(cmd, function() {
            const endTime = new Date();
            if (finished) {
              elapsed = endTime - beginTime;
              console.log(`elapsed = ${elapsed} msecs (req/res)`);
            }
            return server.close();
          }));

          return server.on('close', done);
        };


        return context('given insufficient time to complete', function() {

          before(function(done) {
            timeout = 20;
            console.log(`timeout = ${timeout} msecs`);
            return runTimeoutTestAsync(done);
          });

          after(() => finished = undefined);

          it('should not finish before timeout occurs', () => expect(finished).to.be.false);

          // Errors thrown by Mocha show up in stdout; those by Abao in stderr.
          it('Mocha should throw an error', function() {
            const detail = `Error: Timeout of ${timeout}ms exceeded.`;
            return expect(stdout).to.have.string(detail);
          });

          it('should run test but not complete', () => expect(stdout).to.have.string('1 failing'));

          return it('should exit due to error', () => expect(exitStatus).to.equal(1));
        });
      });


      return describe('when invoked with "--schema" option', function() {

        const runSchemaTestAsync = function(done) {
          const pattern = `${SCHEMA_DIR}/*.json`;
          const ramlFile = `${RAML_DIR}/machines-with_json_refs.raml`;
          const cmd = `${ABAO_BIN} ${ramlFile} --server ${SERVER} --schemas=${pattern}`;

          const app = express();

          app.get('/machines', function(req, res) {
            const machine = {
              type: 'bulldozer',
              name: 'willy'
            };
            return res.status(200).json([machine]);
          });

          var server = app.listen(PORT, () => execCommand(cmd, () => server.close()));

          return server.on('close', done);
        };

        before(done => runSchemaTestAsync(done));

        it('should exit normally', () => expect(exitStatus).to.equal(0));


        return describe('when expecting validation to fail', function() {

          const runSchemaFailTestAsync = function(done) {
            const pattern = `${SCHEMA_DIR}/*.json`;
            const ramlFile = `${RAML_DIR}/machines-with_json_refs.raml`;
            const cmd = `${ABAO_BIN} ${ramlFile} --server ${SERVER} --schemas=${pattern}`;

            const app = express();

            app.get('/machines', function(req, res) {
              const machine = {
                typO: 'bulldozer',       // 'type' != 'typO'
                name: 'willy'
              };
              return res.status(200).json([machine]);
            });

            var server = app.listen(PORT, () => execCommand(cmd, () => server.close()));

            return server.on('close', done);
          };

          before(done => runSchemaFailTestAsync(done));

          return it('should exit due to error', () => expect(exitStatus).to.equal(1));
        });
      });
    });
  });
});

