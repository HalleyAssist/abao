async = require 'async'
_ = require 'underscore'
csonschema = require 'csonschema'

# parent param optional
addTests = (api, tests, hooks, parent, masterCallback, factory) ->
  console.log 'Adding tests'

  # Handle 4th optional param
  if _.isFunction(parent)
    factory = masterCallback
    masterCallback = parent
    parent = null

  resources = api.resources()
  if resources.length == 0 
    console.log 'Out of resources'
  return masterCallback() unless resources.length > 0

  # Iterate endpoint
  async.each api.resources(), (resource, resourceCallback) ->
    path = resource.completeRelativeUri()
    params = {}
    query = {}

    # Setup param
    uriParameters = resource.uriParameters()
    if uriParameters
      for uriParam in resource.uriParameters
        params[uriParam.name()] = uriParam.example()

    # Iterate response method
    async.each resource.methods(), (resourceMethod, methodCallback) ->
      methodName = resourceMethod.method().toUpperCase()

      # Setup query
      for queryParam in resourceMethod.queryParameters()
        if queryParam.required()
          query[queryParam.name()] = queryParam.example()

      # Iterate response status
      for response in resourceMethod.responses()
        status = response.code().value()
        testName = "#{methodName} #{path} -> #{status}"

        # Append new test to tests
        test = factory.create(testName, hooks.contentTests[testName])
        tests.push test
        console.log 'Added Test: ' + testName
		
        # Update test.request
        test.request.path = path
        test.request.method = methodName
        test.request.headers = {}
        for header in resourceMethod.headers()
          test.request.headers[header.name()] = header.example()

        # select compatible content-type in request body
        # (to support vendor tree types, i.e. application/vnd.api+json)
        # Currently only supports json, not XML or others
        for body in resourceMethod.body()
          if body.name().match(/^application\/(.*\+)?json/i)
            requestContentType = body.name()
            test.request.headers['Content-Type'] = requestContentType
            try
              test.request.body = body.example().value()
            catch
              console.warn "cannot parse JSON example request body for #{test.name}"
            break
        test.request.params = params
        test.request.query = query

        # Update test.response
        test.response.status = status
        test.response.schema = null

        responseBodies = response.body()
        responseSchema = null
        for responseBody in responseBodies
          # name() will be equal to content-type
          bodyName = responseBody.name()
          # expect content-type of response body to be identical to request body
          # otherwise filter in responses section for compatible content-types
          # (vendor tree, i.e. application/vnd.api+json)
          if bodyName == requestContentType || bodyName.match(/^application\/(.*\+)?json/i)
            responseSchema = responseBody.schemaContent()
            break
        if responseSchema
          if responseSchema.indexOf('$schema') != -1
            test.response.schema = JSON.parse responseSchema
          else
            test.response.schema = csonschema.parse responseSchema
			
      methodCallback()
    , (err) ->
      return resourceCallback(err) if err
      # Recursive
      addTests resource, tests, hooks, {path, params}, resourceCallback, factory
  , masterCallback


module.exports = addTests