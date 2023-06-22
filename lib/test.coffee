###*
# @file TestFactory/Test classes
###

async = require 'async'
glob = require 'glob'
_ = require 'lodash'
path = require 'path'
pkg = require '../package'
request = require 'request'
requestPkg = require 'request/package'
tv4 = require 'tv4'
Ajv = require("ajv-draft-04")
addFormats = require("ajv-formats")

class TestFactory
  constructor: (config) ->
    'use strict'
    @configuration = config

    if config.options.schemas
      files = glob.sync config.options.schemas

      if files.length == 0
        detail = "no external schema files found matching pattern '#{config.options.schemas}'"
        throw new Error detail

      console.info 'processing external schema file(s):'
      try
        files.map (file) ->
          absFile = path.resolve process.cwd(), file
          console.info "  #{absFile}"
          tv4.addSchema require absFile
        console.log()
      catch error
        console.error 'error loading external schemas...'
        throw error

  create: (name, contentTest) ->
    'use strict'
    return new Test name, contentTest, @configuration



class Test
  constructor: (@name, @contentTest, @configuration) ->
    'use strict'
    @name ?= ''
    @configuration ?= {options: {}}
    @skip = false

    @request =
      server: ''
      path: ''
      method: 'GET'
      params: {}
      query: {}
      headers:
        'User-Agent': @userAgent()
      body: ''

    @response =
      status: 0
      schema: null
      headers: null
      body: null

    @contentTest ?= (response, body, callback) ->
      return callback null

  userAgent: () ->
    'use strict'
    abaoInfo = "#{pkg.name}/#{pkg.version}"
    platformInfo = "#{process.platform}; #{process.arch}"
    requestInfo = "#{requestPkg.name}/#{requestPkg.version}"
    return "#{abaoInfo} (#{platformInfo}) #{requestInfo}"

  url: () ->
    'use strict'
    path = @request.server + @request.path

    for key, value of @request.params
      path = path.replace "{#{key}}", value
    return path

  run: (done) ->
    'use strict'
    validateResponse = @validateResponse
    contentTest = @contentTest

    asString = (value) ->
      if typeof value is 'string'
        return value
      return JSON.stringify value

    options =
      headers: @request.headers
      method: @request.method
      qs: @request.query
      timeout: 10000                   # 10 secs
      url: @url()
    
    if @request.headers["Content-Type"]
      if @request.headers["Content-Type"].match(/^application\/(.*\+)?json/i)
        options.body = asString @request.body
      else if @request.headers["Content-Type"].match(/^multipart\/form\-data/i)
        options.formData = @request.body
    else
      options.body = asString @request.body     # should not happen

    makeHTTPRequest = (callback) ->
      requestCB = (error, response, body) ->
        if error
          maybeReplaceMessage = (error) ->
            error.message = switch
              when error?.code == 'ETIMEDOUT' and error?.connect
                'timed out attempting to establish connection'
              when error?.code == 'ETIMEDOUT'
                'timed out awaiting server response'
              when error?.code == 'ESOCKETTIMEDOUT'
                'timed out when server stopped sending response data'
              when error?.code == 'ECONNRESET'
                'connection reset by server'
              else
                error.message
            return error

          return callback maybeReplaceMessage error
        return callback null, response, body
      request options, requestCB

    async.waterfall [
      makeHTTPRequest,
      (response, body, callback) ->
        try
          validateResponse response, body
        catch err
          callback err
        contentTest response, body, callback
    ], done

  # TODO(plroebuck): add callback parameter and use it...
  validateResponse: (response, body) =>
    'use strict'
    if response is null
      throw new Error 'response is null'

    # Headers
    @response.headers = response.headers

    # Status code
    @response.status = +@response.status    # Ensure this is a number!
    if response.statusCode != @response.status
      actual = response.statusCode
      expected = @response.status
      detail = """
        unexpected response code: actual=#{actual}, expected=#{expected}
        #{body}
      """
      throw new Error detail
    else
      response.status = response.statusCode

    # Body
    @response.body = body
    if @response.schema
      # Empty?
      if body is ''
        throw new Error 'response body is empty'

      # Convert response body to object (or error)
      parseJSON = (str) ->
        return _.attempt JSON.parse.bind null, str

      instance = parseJSON body
      if _.isError instance
        console.error """
          invalid JSON:
            #{body}
        """
        throw instance    # SyntaxError

      # Validate object against JSON schema
      checkRecursive = false
      banUnknown = false
      schema = @response.schema

      # Use ajv validator when using webapi-parser, otherwise fallback to TV4
      if (@configuration.options.typesfile)
        # Compile schema for Ajv. 
        validate = null
        try
          # Add schema exceptions and formats as needed
          ajv = new Ajv()
          ajv.addVocabulary(["example", "x-amf-examples"])
          addFormats(ajv)

          validate = ajv.compile(schema)
        catch err
          throw new Error """ 
            Error compiling schema with ajv: #{err.message} 
          
            Please check RAML for:
            - Examples being defined more than once (resolves to more than one schema error)

            Schema: #{JSON.stringify schema}"""

        # Validate response against schema
        valid = validate(instance)
        if !valid 
          throw new Error """
          schema validation failed:
            #{JSON.stringify validate.errors, null, 2}

          #{JSON.stringify instance, null, 2}"""
      else
        result = tv4.validateResult instance, schema, checkRecursive, banUnknown
        if result.missing.length != 0
          detail = """
            missing/unresolved JSON schema $refs:
              #{result.missing.join '\n'}

            schema:
              #{JSON.stringify schema, null, 2}
          """
          throw new Error detail

        if result.valid == false
          # Provide the exact reasons for validation failure
          subErrors = []
          if result.error?.subErrors
            for subError in result.error.subErrors
              subErrors.push {
                message: subError.message,
                dataPath: subError.dataPath
              }

              # subErrors can be duplicated for each object, don't need all
              if subErrors.length > 5
                break

          detail = """
            schema validation failed:
              #{result.error?.message}

            #{JSON.stringify instance, null, 2}

            Possible reasons: #{JSON.stringify subErrors, null, 2}
          """
          throw new Error detail

      # Update @response
      @response.body = instance
    return


module.exports = TestFactory

