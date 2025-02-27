# Abao

RAML-based automated testing tool

[![Build Status][Travis-Abao-badge]][Travis-Abao]
[![Dependency Status][DavidDM-AbaoDep-badge]][DavidDM-AbaoDep]
[![devDependency Status][DavidDM-AbaoDevDep-badge]][DavidDM-AbaoDevDep]
[![Coverage Status][Coveralls-Abao-badge]][Coveralls-Abao]
[![Gitter][Gitter-Abao-badge]][Gitter-Abao]
[![CII Best Practices][BestPractices-Abao-badge]][BestPractices-Abao]

**Abao** is a command-line tool for testing API documentation written in
[RAML][] format against its back-end implementation. With **Abao**, you can
easily plug your API documentation into a Continuous Integration (CI) system
(e.g., [Travis][], [Jenkins][]) and have API documentation up-to-date, all
the time. **Abao** uses [Mocha][] for judging if a particular API response
is valid or not.

[![NPM][NPM-Abao-badge]][NPM-Abao]

## Features

* Verify that each endpoint defined in RAML exists in service
* Verify that URL params for each endpoint defined in RAML are supported in service
* Verify that the required query parameters defined in RAML are supported in service
* Verify that HTTP request headers for each endpoint defined in RAML are supported in service
* Verify that HTTP request body for each endpoint defined in RAML is supported in service, via [JSONSchema][] validation
* Verify that HTTP response headers for each endpoint defined in RAML are supported in service
* Verify that HTTP response body for each endpoint defined in RAML is supported in service, via [JSONSchema][] validation

## RAML Support

This version of the software **only** supports the [RAML-1.0][] specification.
## Installation

Install stable version of full package globally.

```bash
$ npm install -g abao
```

A trimmed down version (without developer dependencies) can be installed for
production usage.

```bash
$ npm install --only=prod -g abao
```

Install latest development version in GitHub branch

```bash
$ npm install -g github:cybertk/abao
```

If you get an `EACCES` error, see
[this](https://docs.npmjs.com/getting-started/fixing-npm-permissions)
NPM documentation.

## Get Started Testing Your API

### Using Bash/CLI

For general usage, an API endpoint (i.e., web service to be tested) **must**
be specified; this can be done implicitly or explicitly, with the latter
having priority. If the RAML file to be tested provides a [baseUri][] property,
the API endpoint is implicitly set to that value.

```bash
$ abao api.raml
```

To explicitly specify the API endpoint, use the `--server` argument.

```bash
$ abao api.raml --server http://localhost:8080
```

### Using Node

Abao was originally designed to be run via CLI. In some situations, it may be better to run it within Node (e.g. inside a Mocha test) to allow easier setup/teardown of a Node application.

This branch can be run inside of Node using:

```javascript
const Abao = require('abao')

const abao = new Abao(abaoOptions)
await abao.run()
```

Note that not all options accepted by Abao's CLI interface are accepted. Accepted Abao options:

- ramlfile: The filepath of the main RAML file (e.g. "api.raml")
- hookfiles: The filepath of the additional test setup/teardown hooks file. This file should have a ".hooks" extension when importing `hooks` and `factory` modules since Abao mocks these on loading and Node will otherwise throw an error at runtime.
- sorted: Whether to sort the RAML to run in a sensible way. See the CLI documentation on usage of this.
- typesfile: The filepath of the RAML type file. See the CLI documentation on usage of this.
- timeout: The timeout of test cases. See the CLI documentation on usage of this.

## Writing testable RAML

**Abao** validates the HTTP response body against `schema` defined in [RAML][].
**No response body will be returned if the corresponding [RAML][] `schema` is missing.**
However, the response status code can **always** be verified, regardless.

## Hooks

**Abao** can be configured to use hookfiles to do basic setup/teardown between
each validation (specified with the `--hookfiles` flag). Hookfiles can be
written in either JavaScript or CoffeeScript, and must import the hook methods.

**NOTE**: CoffeeScript files **must** use file extension `.coffee`.

Requests are identified by their name, which is derived from the structure of
the RAML. You can print a list of the generated names with the `--names` flag.

### Example

The RAML file used in the examples below can be found [here](../master/test/fixtures/machines-single_get.raml).

Get Names:

```bash
$ abao machines-single_get.raml --names
GET /machines -> 200
```

**Abao** can generate a hookfile to help validate more than just the
response code for each path.

```bash
$ ABAO_HOME="/path/to/node_modules/abao"
$ TEMPLATE="${ABAO_HOME}/templates/hookfile.js"
$ abao machines-single_get.raml --generate-hooks --template="${TEMPLATE}" > test_machines_hooks.js

```

Then edit the *JavaScript* hookfile `test_machines_hooks.js` created in the
previous step to add request parameters and response validation logic.

```javascript
var
  hooks = require('hooks'),
  assert = require('chai').assert;

hooks.before('GET /machines -> 200', function (test, done) {
  test.request.query = {
    color: 'red'
  };
  done();
});

hooks.after('GET /machines -> 200', function (test, done) {
  machine = test.response.body[0];
  console.log(machine.name);
  done();
});
```

Alternately, write the same hookfile in *CoffeeScript* named
`test_machines_hooks.coffee`:

```coffeescript
{before, after} = require 'hooks'
{assert} = require 'chai'

before 'GET /machines -> 200', (test, done) ->
  test.request.query =
    color: 'red'
  done()

after 'GET /machines -> 200', (test, done) ->
  machine = test.response.body[0]
  console.log machine.name
  done()
```

Run validation with *JavaScript* hookfile (from above):

```bash
$ abao machines-single_get.raml --hookfiles=test_machines_hooks.js
```

You can also specify what tests **Abao** should skip:

```javascript
var
  hooks = require('hooks');

hooks.skip('DELETE /machines/{machineId} -> 204');
```

**Abao** supports callbacks for intro and outro (coda) of all tests,
as well as before/after each test:

```coffeescript
{beforeAll, beforeEach, afterEach, afterAll} = require 'hooks'

beforeAll (done) ->
  # runs one-time setup before all tests (intro)
  done()

beforeEach (done) ->
  # runs generic setup before any test-specific 'before()`
  done()

afterEach (done) ->
  # runs generic teardown after any test-specific 'after()'
  done()

afterAll (done) ->
  # do one-time teardown after all tests (coda)
  done()
```

If `beforeEach`, `afterEach`, `before` and `after` are called multiple times,
the callbacks are executed serially in the order they were called.

**Abao** provides hook to allow the content of the response to be checked
within the test:

```coffeescript
{test} = require 'hooks'
{assert} = require 'chai'

test 'GET /machines -> 200', (response, body, done) ->
  assert.deepEqual JSON.parse(body), ['machine1', 'machine2']
  assert.equal headers['content-type'], 'application/json; charset=utf-8'
  return done()
```

### test.request

* `server` - Server address, provided by command line option or parsed from
  RAML `baseUri`.
* `path` - API endpoint path, parsed from RAML.
* `method` - HTTP method, parsed from RAML request method (e.g., `get`).
* `params` - URI parameters, parsed from RAML request `uriParameters` [default: `{}`].
* `query` - Object containing querystring values to be appended to the `path`.
  Parsed from RAML `queryParameters` section [default: `{}`].
* `headers` - HTTP headers, parsed from RAML `headers` [default: `{}`].
* `body` - Entity body for POST, PUT, and PATCH requests. Must be a
  JSON-serializable object. Parsed from RAML `example` [default: `{}`].

### test.response

* `status` - Expected HTTP response code, parsed from RAML response status.
* `schema` - Expected schema of HTTP response body, parsed from RAML response `schema`.
* `headers` - Object containing HTTP response headers from server [default: `{}`].
* `body` - HTTP response body (JSON-format) from server [default: `null`].

## Command Line Options

```console
Usage:
  abao </path/to/raml> [OPTIONS]

Example:
  abao api.raml --server http://api.example.com

Options passed to Mocha:
  --grep, -g      Only run tests matching <pattern>                     [string]
  --invert, -i    Invert --grep matches                                [boolean]
  --reporter, -R  Specify reporter to use             [string] [default: "spec"]
  --reporters     Display available reporters and exit                 [boolean]
  --timeout, -t   Set test case timeout in milliseconds [number] [default: 2000]

Options:
  --generate-hooks  Output hooks generated from template file and exit [boolean]
  --header, -h      Add header to include in each request. Header must be in
                    KEY:VALUE format (e.g., "-h Accept:application/json").
                    Reuse option to add multiple headers                [string]
  --hookfiles, -f   Specify pattern to match JavaScript/CoffeeScript files with
                    before/after hooks for running tests                [string]
  --hooks-only, -H  Run test only if defined either before or after hooks
                                                                       [boolean]
  --names, -n       List names of requests and exit                    [boolean]
  --schemas         Specify pattern to match JSON-formatted schema files to be
                    loaded for use as JSON $refs                        [string]
  --server          Specify API endpoint to use. The RAML-specified baseUri
                    value will be used if not provided                  [string]
  --sorted          Sorts requests in a sensible way so that objects are not
                    modified before they are created.
                    Order: CONNECT, OPTIONS, POST, GET, HEAD, PUT, PATCH,
                    DELETE, TRACE.                                     [boolean]
  --template        Specify Mustache template file to use for generating hooks
                                                                        [string]
  --typesfile,      Path to types.raml file. If supplied, will try to use
                    the updated webapi-parser for type schema 
                    generation                                          [string]                                                                       
  --help            Show usage information and exit                    [boolean]
  --version         Show version number and exit                       [boolean]
```

## Run Tests

```bash
$ npm test
```

## Contribution

**Abao** is always looking for new ideas to make the codebase useful.
If you think of something that would make life easier, please submit an issue.

```bash
$ npm issues abao
```


[//]: # (Cross reference section)

[RAML]: https://raml.org/
[Mocha]: https://mochajs.org/
[JSONSchema]: http://json-schema.org/
[Travis]: https://travis-ci.org/
[Jenkins]: https://jenkins-ci.org/
[RAML-0.8]: https://github.com/raml-org/raml-spec/blob/master/versions/raml-08/raml-08.md
[baseUri]: https://github.com/raml-org/raml-spec/blob/master/versions/raml-08/raml-08.md#base-uri-and-baseuriparameters

[Travis-Abao]: https://travis-ci.org/cybertk/abao/
[Travis-Abao-badge]: https://img.shields.io/travis/cybertk/abao.svg?style=flat
[DavidDM-AbaoDep]: https://david-dm.org/cybertk/abao/
[DavidDM-AbaoDep-badge]: https://david-dm.org/cybertk/abao/status.svg
[DavidDM-AbaoDevDep]: https://david-dm.org/cybertk/abao?type=dev
[DavidDM-AbaoDevDep-badge]: https://david-dm.org/cybertk/abao/dev-status.svg
[Coveralls-Abao]: https://coveralls.io/r/cybertk/abao/
[Coveralls-Abao-badge]: https://img.shields.io/coveralls/cybertk/abao.svg
[Gitter-Abao]: https://gitter.im/cybertk/abao/
[Gitter-Abao-badge]: https://badges.gitter.im/cybertk/abao.svg
[BestPractices-Abao]: https://bestpractices.coreinfrastructure.org/projects/388
[BestPractices-Abao-badge]: https://bestpractices.coreinfrastructure.org/projects/388/badge
[NPM-Abao]: https://npmjs.org/package/abao/
[NPM-Abao-badge]: https://nodei.co/npm/abao.png?downloads=true&downloadRank=true&stars=true

