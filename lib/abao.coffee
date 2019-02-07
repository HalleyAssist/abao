###*
# @file Abao class
###

require('source-map-support').install({handleUncaughtExceptions: false})
async = require 'async'
ramlParser = require 'raml-1-parser'

addHooks = require './add-hooks'
addTests = require './add-tests'
TestFactory = require './test'
asConfiguration = require './configuration'
hooks = require './hooks'
Runner = require './test-runner'

defaultArgs =
  _: []
  options:
    help: true


class Abao
  constructor: (parsedArgs = defaultArgs) ->
    'use strict'
    @configuration = asConfiguration parsedArgs
    @tests = []
    @hooks = hooks

  run: (done) ->
    'use strict'
    config = @configuration
    tests = @tests
    hooks = @hooks

    # Inject the JSON refs schemas
    factory = new TestFactory(config.options.schemas)

    parseHooks = (callback) ->
      console.log 'Add Hooks'
      addHooks hooks, config.options.hookfiles, callback
      return # NOTREACHED

    loadRAML = (callback) ->
      console.log 'Load RAML'
      if !config.ramlPath
        nofile = new Error 'unspecified RAML file'
        return callback nofile

      ramlParser.loadApi config.ramlPath
        .then (raml) ->
          return callback null, raml
        .catch (err) ->
          return callback err
      return # NOTREACHED

    parseTestsFromRAML = (raml, callback) ->
      console.log 'Parse Tests'
      if !config.options.server
        if raml.baseUri()
          config.options.server = raml.baseUri().value()
      console.log config.options.server
      addTests raml, tests, hooks, {}, callback, factory
      return # NOTREACHED

    runTests = (callback) ->
      console.log 'Running Tests'
      runner = new Runner config.options, config.ramlPath
      runner.run tests, hooks, callback
      return # NOTREACHED

    async.waterfall [
      parseHooks,
      loadRAML,
      parseTestsFromRAML,
      runTests
    ], done
    return



module.exports = Abao

