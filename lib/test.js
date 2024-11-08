/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/**
 * @file TestFactory/Test classes
 */

const async = require('async');
const glob = require('glob');
const _ = require('lodash');
let path = require('path');
const pkg = require('../package');
const request = require('request');
const requestPkg = require('request/package');
const tv4 = require('tv4');
const Ajv = require("ajv-draft-04");
const addFormats = require("ajv-formats");
const { EventEmitter } = require('events');

class ResponseError extends Error {
  constructor(response, detail) {
    super(detail);
    this.response = response;
    this.statusCode = response.statusCode;
  }
}

class TestFactory extends EventEmitter {
  constructor(config) {
    super()
    if (config == null) { config = {}; }
    'use strict';
    this.configuration = config;

    if (config.options != null ? config.options.schemas : undefined) {
      const files = glob.sync(config.options.schemas);

      if (files.length === 0) {
        const detail = `no external schema files found matching pattern '${config.options.schemas}'`;
        throw new Error(detail);
      }

      console.info('processing external schema file(s):');
      try {
        files.map(function(file) {
          const absFile = path.resolve(process.cwd(), file);
          console.info(`  ${absFile}`);
          return tv4.addSchema(require(absFile));
        });
        console.log();
      } catch (error) {
        console.error('error loading external schemas...');
        throw error;
      }
    }
  }

  create(name, contentTest) {
    'use strict';
    return new Test(name, contentTest, this);
  }

  onError(test, e){
    this.emit('failed_test', {test, error:e});
  }
}



class Test {
  constructor(name, contentTest, testFactory) {
    this.validateResponse = this.validateResponse.bind(this);
    this.name = name;
    this.contentTest = contentTest;
    this.configuration = testFactory.configuration;
    this.onError = (error) => testFactory.onError(this, error);
    'use strict';
    if (this.name == null) { this.name = ''; }
    if (this.configuration == null) { this.configuration = {options: {}}; }
    this.skip = false;

    this.request = {
      server: '',
      path: '',
      method: 'GET',
      params: {},
      query: {},
      headers: {
        'User-Agent': this.userAgent()
      },
      body: ''
    };

    this.response = {
      status: 0,
      schema: null,
      headers: null,
      body: null
    };

    if (this.contentTest == null) { this.contentTest = (response, body, callback) => callback(null); }
  }

  userAgent() {
    'use strict';
    const abaoInfo = `${pkg.name}/${pkg.version}`;
    const platformInfo = `${process.platform}; ${process.arch}`;
    const requestInfo = `${requestPkg.name}/${requestPkg.version}`;
    return `${abaoInfo} (${platformInfo}) ${requestInfo}`;
  }

  url() {
    'use strict';
    path = this.request.server + this.request.path;

    for (var key in this.request.params) {
      var value = this.request.params[key];
      path = path.replace(`{${key}}`, value);
    }
    return path;
  }

  run(done) {
    'use strict';
    const {
      validateResponse
    } = this;
    const {
      contentTest
    } = this;

    const asString = function(value) {
      if (typeof value === 'string') {
        return value;
      }
      return JSON.stringify(value);
    };

    const options = {
      headers: this.request.headers,
      method: this.request.method,
      qs: this.request.query,
      timeout: 10000,                   // 10 secs
      url: this.url()
    };
    
    if (this.request.headers["Content-Type"]) {
      if (this.request.headers["Content-Type"].match(/^application\/(.*\+)?json/i)) {
        options.body = asString(this.request.body);
      } else if (this.request.headers["Content-Type"].match(/^multipart\/form\-data/i)) {
        options.formData = this.request.body;
      }
    } else {
      options.body = asString(this.request.body);     // should not happen
    }

    const makeHTTPRequest = function(callback) {
      const requestCB = function(error, response, body) {
        if (error) {
          const maybeReplaceMessage = function(error) {
            error.message = (() => { switch (false) {
              case ((error != null ? error.code : undefined) !== 'ETIMEDOUT') || !(error != null ? error.connect : undefined):
                return 'timed out attempting to establish connection';
              case (error != null ? error.code : undefined) !== 'ETIMEDOUT':
                return 'timed out awaiting server response';
              case (error != null ? error.code : undefined) !== 'ESOCKETTIMEDOUT':
                return 'timed out when server stopped sending response data';
              case (error != null ? error.code : undefined) !== 'ECONNRESET':
                return 'connection reset by server';
              default:
                return error.message;
            } })();
            return error;
          };

          return callback(maybeReplaceMessage(error));
        }
        return callback(null, response, body);
      };
      return request(options, requestCB);
    };

    return async.waterfall([
      makeHTTPRequest,
      function(response, body, callback) {
        try {
          validateResponse(response, body);
        } catch (err) {
          callback(err);
          return
        }
        return contentTest(response, body, callback);
      }
    ], (e)=>{
      if(e) this.onError(e);
      done(e)
    });
  }

  // TODO(plroebuck): add callback parameter and use it...
  validateResponse(response, body) {
    'use strict';
    let detail;
    if (response === null) {
      throw new Error('response is null');
    }

    // Headers
    this.response.headers = response.headers;

    // Status code
    this.response.status = +this.response.status;    // Ensure this is a number!
    if (response.statusCode !== this.response.status) {
      const actual = response.statusCode;
      const expected = this.response.status;
      detail = `unexpected response code: actual=${actual}, expected=${expected}`;
      throw new ResponseError(response, detail);
    } else {
      response.status = response.statusCode;
    }

    // Body
    this.response.body = body;
    if (this.response.schema) {
      // Empty?
      let valid;
      if (body === '') {
        throw new ResponseError(response, 'response body is empty');
      }

      // Convert response body to object (or error)
      const parseJSON = str => _.attempt(JSON.parse.bind(null, str));

      const instance = parseJSON(body);
      if (_.isError(instance)) {
        console.error(`\
invalid JSON:
  ${body}\
`
        );
        throw instance;    // SyntaxError
      }

      // Validate object against JSON schema
      const checkRecursive = false;
      const banUnknown = false;
      const {
        schema
      } = this.response;

      // Use ajv validator when using webapi-parser, otherwise fallback to TV4
      if (this.configuration.options.typesfile) {
        // Compile schema for Ajv. 
        let validate = null;
        try {
          // Add schema exceptions and formats as needed
          const ajv = new Ajv();
          ajv.addVocabulary(["example", "x-amf-examples"]);
          addFormats(ajv);

          validate = ajv.compile(schema);
        } catch (err) {
          throw new ResponseError(response, `\
Error compiling schema with ajv: ${err.message} 
          
Please check RAML for:
- Examples being defined more than once (resolves to more than one schema error)

Schema: ${JSON.stringify(schema)}`
          );
        }

        // Validate response against schema
        valid = validate(instance);
        if (!valid) { 
          throw new ResponseError(response, `\
schema validation failed:
  ${JSON.stringify(validate.errors, null, 2)}

${JSON.stringify(instance, null, 2)}`
          );
        }
      } else {
        const result = tv4.validateResult(instance, schema, checkRecursive, banUnknown);
        if (result.missing.length !== 0) {
          detail = `\
missing/unresolved JSON schema $refs:
  ${result.missing.join('\n')}

schema:
  ${JSON.stringify(schema, null, 2)}\
`;
          throw new ResponseError(response, detail);
        }

        if (result.valid === false) {
          // Provide the exact reasons for validation failure
          const subErrors = [];
          if (result.error != null ? result.error.subErrors : undefined) {
            for (var subError of Array.from(result.error.subErrors)) {
              subErrors.push({
                message: subError.message,
                dataPath: subError.dataPath
              });

              // subErrors can be duplicated for each object, don't need all
              if (subErrors.length > 5) {
                break;
              }
            }
          }

          detail = `\
schema validation failed:
  ${(result.error != null ? result.error.message : undefined)}

${JSON.stringify(instance, null, 2)}

Possible reasons: ${JSON.stringify(subErrors, null, 2)}\
`;
          throw new ResponseError(response, detail);
        }
      }

      // Update @response
      this.response.body = instance;
    }
  }
}


module.exports = TestFactory;

