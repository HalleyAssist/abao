async = require "async"
_ = require "underscore"
csonschema = require "csonschema"
raml2json = require "ramldt2jsonschema"

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
    resource.ramlPath ?= api.ramlPath
    resource.ramlData ?= api.ramlData

    # Setup param
    uriParameters = resource.allUriParameters
    if uriParameters
      for uriParam in uriParameters
        if uriParam.example
          params[uriParam.name] = uriParam.example
        if uriParam.examples
          params[uriParam.name] = uriParam.examples[0].structuredValue

    # Iterate response method
    async.each resource.methods, (resourceMethod, methodCallback) ->
      methodName = resourceMethod.method.toUpperCase()

      query = {}
      # Setup query
      if resourceMethod.queryParameters
        for queryParam in resourceMethod.queryParameters
          if queryParam.required
            if queryParam.example
              query[queryParam.name] = queryParam.example
            if queryParam.examples
              query[queryParam.name] = queryParam.examples[0].structuredValue

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
              if header.examples.length > 0
                test.request.headers[header.name] = header.examples[0].structuredValue

          if resourceMethod.body
            # select compatible content-type in request body
            # (to support vendor tree types, i.e. application/vnd.api+json)
            # Currently only supports json, not XML or others
            for body in resourceMethod.body
              requestContentType = body.key
              test.request.headers["Content-Type"] = requestContentType
              if body.key.match(/^application\/(.*\+)?json/i) || body.key.match(/^text\/plain/i)
                try
                  if body.examples && body.examples.length > 0
                    if body.key.match(/^text\/plain/i)
                      test.request.body = body.examples[0].structuredValue
                    else
                      test.request.body = JSON.parse(body.examples[0].value)
                  break if test.request.body
                  if body.properties && body.properties.length > 0
                    if body.properties[0].rawType && body.properties[0].rawType.example
                      test.request.body[body.properties[0]] = body.properties[0].rawType.example
                    if body.properties[0].examples && body.properties[0].examples.length > 0
                      if body.key.match(/^text\/plain/i)
                        test.request.body[body.properties[0]] = body.properties[0].examples[0].structuredValue
                      else
                        test.request.body = JSON.parse(body.properties[0].examples[0].value)
                catch err
                  console.warn "Cannot parse JSON example request body for #{test.name} => " + err
                  console.warn JSON.stringify body, null, 2
                break if test.request.body
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
              if bodyName.match(/^application\/(.*\+)?json/i)
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
              bodyKey = responseBody.key
              if bodyKey.match(/^application\/(.*\+)?json/i)
                if responseBody.rawType
                  responseType = responseBody.rawType.name
                  break
                else if responseBody.type == "array"
                  if responseBody.items.rawType
                    responseType = responseBody.items.rawType.name
                    break
                  else
                    responseType = responseBody.items.type
                    break
                else if responseBody.type != "object"
                  responseType = responseBody.type
                  break
                  
            if responseType
              try
                # should use raml type to json schema rather than schema-ify the examples.
                raml2json.dt2js.setBasePath(resource.ramlPath)
                test.response.schema = raml2json.dt2js resource.ramlData, responseType
              catch err
                console.warn "ramldt2jsonschema: error parsing type: " + responseType + ". Error: " + err

      methodCallback()
    , (err) ->
      if err
        console.log err
      return resourceCallback(err) if err
      # Recursive
      addTests resource, tests, hooks, {path, params}, resourceCallback, factory
  , masterCallback

getTypeName = (body) ->
  console.log body
  return body.items.name if body.type == "array"
  return body.name if body.type == "object"

module.exports = addTests