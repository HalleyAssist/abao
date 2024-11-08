/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const async = require("async");
const _ = require("underscore");
const csonschema = require("csonschema");
const raml2json = require("ramldt2jsonschema");

// parent param optional
var addTests = function(api, tests, hooks, parent, masterCallback, factory, sortFirst) {

  // Handle 4th optional param
  if (_.isFunction(parent)) {
    factory = masterCallback;
    masterCallback = parent;
    parent = null;
  }

  if (!api.resources) { return masterCallback(); }

  // Iterate endpoint
  return async.eachSeries(api.resources, function(resource, resourceCallback) {
    const path = resource.parentUrl + resource.relativeUri;
    const params = {};
    if (resource.ramlPath == null) { resource.ramlPath = api.ramlPath; }
    if (resource.ramlData == null) { resource.ramlData = api.ramlData; }
    if (resource.ramlTypes == null) { resource.ramlTypes = api.ramlTypes; }
    if (resource.webApiModel == null) { resource.webApiModel = api.webApiModel; }

    // Setup param
    const uriParameters = resource.allUriParameters;
    if (uriParameters) {
      for (var uriParam of Array.from(uriParameters)) {
        if (uriParam.example) {
          params[uriParam.name] = uriParam.example;
        }
        if (uriParam.examples) {
          params[uriParam.name] = uriParam.examples[0].structuredValue;
        }
      }
    }

    // In case of issue #8, resource does not define methods
    if (resource.methods == null) { resource.methods = []; }

    // Sort tests (if required)
    if (sortFirst && (resource.methods.length > 1)) {
      const methodTests = [
          {method: 'CONNECT', tests: []}
        ,
          {method: 'OPTIONS', tests: []}
        ,
          {method: 'POST',    tests: []}
        ,
          {method: 'GET',     tests: []}
        ,
          {method: 'HEAD',    tests: []}
        ,
          {method: 'PUT',     tests: []}
        ,
          {method: 'PATCH',   tests: []}
        ,
          {method: 'DELETE',  tests: []}
        ,
          {method: 'TRACE',   tests: []}
      ];

      // Group endpoint tests by method name
      _.each(methodTests, function(methodTest) {
        const isSameMethod = test => methodTest.method === test.method.toUpperCase();

        const ans = _.partition(resource.methods, isSameMethod);
        if (ans[0].length !== 0) {
          _.each(ans[0], test => methodTest.tests.push(test));
          return resource.methods = ans[1];
        }
    });

      // Shouldn't happen unless new HTTP method introduced...
      const leftovers = resource.methods;
      if (leftovers.length > 1) {
        console.error('unknown method calls present!', leftovers);
      }

      // Now put them back, but in order of methods listed above
      const sortedTests = _.map(methodTests, methodTest => methodTest.tests);
      const leftoverTests = _.map(leftovers, leftover => leftover);
      const reassembled = _.flatten([_.reject(sortedTests,   _.isEmpty,
                                   _.reject(leftoverTests, _.isEmpty))]);
      resource.methods = reassembled;
    }

    // Iterate response method
    return async.eachSeries(resource.methods, function(resourceMethod, methodCallback) {
      const methodName = resourceMethod.method.toUpperCase();

      const query = {};
      // Setup query
      if (resourceMethod.queryParameters) {
        for (var queryParam of Array.from(resourceMethod.queryParameters)) {
          if (queryParam.required) {
            if (queryParam.example) {
              query[queryParam.name] = queryParam.example;
            }
            if (queryParam.examples) {
              query[queryParam.name] = queryParam.examples[0].structuredValue;
            }
          }
        }
      }

      // Iterate response status
      if (!resourceMethod.responses) {
        return methodCallback();
      }

      return async.eachSeries(resourceMethod.responses, function(response, responseCallback) {
        let body, err, responseBody;
        const status = response.code;
        const testName = `${methodName} ${path} -> ${status}`;

        // Append new test to tests
        const test = factory.create(testName, hooks.contentTests[testName]);
        tests.push(test);

        // Update test.request
        test.request.path = path;
        test.request.method = methodName;
        test.request.headers = {};
        
        if (resourceMethod.headers) {
          for (var header of Array.from(resourceMethod.headers)) {
            if (header.examples.length > 0) {
              test.request.headers[header.name] = header.examples[0].structuredValue;
            }
          }
        }

        if (resourceMethod.body) {
          // select compatible content-type in request body
          // (to support vendor tree types, i.e. application/vnd.api+json)
          // Currently only supports json, not XML or others
          for (body of Array.from(resourceMethod.body)) {
            var requestContentType = body.key;
            test.request.headers["Content-Type"] = requestContentType;
            if (body.key.match(/^application\/(.*\+)?json/i) || body.key.match(/^text\/plain/i)) {
              try {
                if (body.examples && (body.examples.length > 0)) {
                  if (body.key.match(/^text\/plain/i)) {
                    test.request.body = body.examples[0].structuredValue;
                  } else {
                    test.request.body = JSON.parse(body.examples[0].value);
                  }
                }
                if (test.request.body) { break; }
                if (body.properties && (body.properties.length > 0)) {
                  if (body.properties[0].rawType && body.properties[0].rawType.example) {
                    test.request.body[body.properties[0]] = body.properties[0].rawType.example;
                  }
                  if (body.properties[0].examples && (body.properties[0].examples.length > 0)) {
                    if (body.key.match(/^text\/plain/i)) {
                      test.request.body[body.properties[0]] = body.properties[0].examples[0].structuredValue;
                    } else {
                      test.request.body = JSON.parse(body.properties[0].examples[0].value);
                    }
                  }
                }
              } catch (error) {
                err = error;
                console.warn(`Cannot parse JSON example request body for ${test.name} => ` + err);
                console.warn(JSON.stringify(body, null, 2));
              }
              if (test.request.body) { break; }
            }
          }
        }
        test.request.params = params;
        test.request.query = query;

        // Update test.response
        test.response.status = status;
        test.response.schema = null;

        const responseBodies = response.body;
        let responseSchema = null;
        
        if (responseBodies) {
          for (responseBody of Array.from(responseBodies)) {
            // name will be equal to content-type
            var bodyName = responseBody.name;
            // expect content-type of response body to be identical to request body
            // otherwise filter in responses section for compatible content-types
            // (vendor tree, i.e. application/vnd.api+json)
            if (bodyName.match(/^application\/(.*\+)?json/i)) {
              responseSchema = responseBody.schema;
              break;
            }
          }
        }

        if (responseSchema) {  // RAML 0.8 uses schemas
          try {
            if (responseSchema.indexOf("$schema") !== -1) {
              test.response.schema = JSON.parse(responseSchema);
            } else {
              test.response.schema = csonschema.parse(responseSchema);
            }
          } catch (error1) {
            err = error1;
            console.warn("error parsing schema: " + err);
          }
        } else if (responseBodies) { // types are only valid in RAML 1.0
          let responseType = null;
          for (responseBody of Array.from(responseBodies)) {
            var bodyKey = responseBody.key;
            if (bodyKey.match(/^application\/(.*\+)?json/i)) {
              if (responseBody.rawType) {
                responseType = responseBody.rawType.name;
                break;
              } else if (responseBody.type === "array") {
                if (responseBody.items.rawType) {
                  responseType = responseBody.items.rawType.name;
                  break;
                } else {
                  responseType = responseBody.items.type;
                  break;
                }
              } else if (responseBody.type !== "object") {
                responseType = responseBody.type.replace('types.', '');
                break;
              }
            }
          }
        
          // Skip proper RAML -> JSON schema conversion if just schema-ifying the examples
          if (!responseType) {
            return responseCallback();
          }

          // Use webapi-parser where possible, otherwise revert to raml2json v0.3.1 (more reliable but schema can be inaccurate)
          if (resource.webApiModel) {
            test.response.schema = JSON.parse(resource.webApiModel.getDeclarationByName(responseType).buildJsonSchema());
          } else {
            raml2json.dt2js.setBasePath(resource.ramlPath);
            test.response.schema = raml2json.dt2js(resource.ramlData, responseType);
          }
        }

        return responseCallback();
      }
      , methodCallback);
    }
    , function(err) {
      if (err) {
        console.log(err);
      }
      if (err) { return resourceCallback(err); }
      // Recursive
      return addTests(resource, tests, hooks, {path, params}, resourceCallback, factory, sortFirst);
    });
  }
  , masterCallback);
};

const getTypeName = function(body) {
  console.log(body);
  if (body.type === "array") { return body.items.name; }
  if (body.type === "object") { return body.name; }
};

module.exports = addTests;