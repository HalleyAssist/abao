async = require "async"
_ = require "underscore"
csonschema = require "csonschema"
jsonSchemaGenerator = require "json-schema-generator"

# parent param optional
addTests = (api, tests, hooks, parent, masterCallback, factory) ->

  # Handle 4th optional param
  if _.isFunction(parent)
    factory = masterCallback
    masterCallback = parent
    parent = null

  return masterCallback() unless api.resources

  # Iterate endpoint
  async.each api.resources, (resource, resourceCallback) ->
    path = resource.parentUrl + resource.relativeUri
    params = {}
    query = {}

    # Setup param
    uriParameters = resource.allUriParameters
    if uriParameters
      for uriParam in uriParameters
        if uriParam.examples
          params[uriParam.name] = uriParam.examples[0].structuredValue

    # Iterate response method
    async.each resource.methods, (resourceMethod, methodCallback) ->
      methodName = resourceMethod.method.toUpperCase()

      # Setup query
      if resourceMethod.queryParameters
        for queryParam in resourceMethod.queryParameters
          if queryParam.required
            query[queryParam.name] = queryParam.example

      # Iterate response status
      if resourceMethod.responses
        for response in resourceMethod.responses
          status = response.code
          testName = "#{methodName} #{path} -> #{status}"

          # Append new test to tests
          test = factory.create(testName, hooks.contentTests[testName])
          tests.push test

          # Update test.request
          test.request.path = path
          test.request.method = methodName
          test.request.headers = {}
          
          if resourceMethod.headers
            for header in resourceMethod.headers
              test.request.headers[header.name] = header.example

          if resourceMethod.body
            # select compatible content-type in request body
            # (to support vendor tree types, i.e. application/vnd.api+json)
            # Currently only supports json, not XML or others
            for body in resourceMethod.body
              if body.name.match(/^application\/(.*\+)?json/i)
                requestContentType = body.name
                test.request.headers["Content-Type"] = requestContentType
                try
                  if body.properties && body.properties.length > 0 && body.properties[0].examples && body.properties[0].examples.length > 0
                    test.request.body = body.properties[0].examples[0].structuredValue
                  else if body.examples && body.examples.length > 0
                    test.request.body = body.examples[0].structuredValue
                catch err
                  console.warn "cannot parse JSON example request body for #{test.name} => " + err
                  console.warn body
                break
          test.request.params = params
          test.request.query = query

          # Update test.response
          test.response.status = status
          test.response.schema = null

          responseBodies = response.body
          responseSchema = null
          if responseBodies
            for responseBody in responseBodies
              # name will be equal to content-type
              bodyName = responseBody.name
              # expect content-type of response body to be identical to request body
              # otherwise filter in responses section for compatible content-types
              # (vendor tree, i.e. application/vnd.api+json)
              if bodyName == requestContentType || bodyName.match(/^application\/(.*\+)?json/i)
                responseSchema = responseBody.schema
                break

          if responseSchema  # RAML 0.8 uses schemas
            try
              if responseSchema.indexOf("$schema") != -1
                test.response.schema = JSON.parse responseSchema
              else
                test.response.schema = csonschema.parse responseSchema
            catch err
              console.warn "error parsing schema: " + err
          else if responseBodies # types are only valid in RAML 1.0
            responseType = null
            for responseBody in responseBodies
              bodyName = responseBody.name
              if bodyName == requestContentType || bodyName.match(/^application\/(.*\+)?json/i)
                if responseBody.properties
                  for bodyProps in responseBody.properties
                    responseType ?= {}
                    if bodyProps.type == "array" && bodyProps.items.examples
                      responseType[bodyProps.key] = [ bodyProps.items.examples[0].structuredValue ]
                      break
                    else if bodyProps.type == "object" && bodyProps.examples
                      responseType[bodyProps.key] = bodyProps.examples[0].structuredValue
                      break
                      
            if responseType
              try
                test.response.schema = jsonSchemaGenerator responseType
              catch err
                console.warn "error parsing type: " + responseType + ". error: " + err
      methodCallback()
    , (err) ->
      if err
        console.log err
      return resourceCallback(err) if err
      # Recursive
      addTests resource, tests, hooks, {path, params}, resourceCallback, factory
  , masterCallback


module.exports = addTests