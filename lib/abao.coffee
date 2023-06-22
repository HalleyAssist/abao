###*
# @file Abao class
###

require('source-map-support').install({handleUncaughtExceptions: false})
async = require 'async'
raml2obj = require 'raml2obj'
fs = require 'fs'
path = require "path"
addHooks = require './add-hooks'
addTests = require './add-tests'
TestFactory = require './test'
asConfiguration = require './configuration'
hooks = require './hooks'
Runner = require './test-runner'
wap = require('webapi-parser').WebApiParser

defaultArgs =
  _: []
  options:
    help: true

# Patch provided types files to suit webapi-parser
patchRamlTypes = (typeFilePath) ->
  # Read provided raml types file
  types = null
  try
    types = fs.readFileSync(typeFilePath).toString()
  catch err
    throw Error("Failed to read provided types file: #{err}")

  # Patch file
  dataPieces = types.split('\n')
  newStrings = []
  for dP, index in dataPieces
    # Indent type definition (will be nested under 'types')
    dataPieces[index] = """  #{dP}"""
    dataType = dP.match(/^(\w.*):/g)
    if (!dataType)
      continue

    # Add RAML API entry for datatype (required for webapi-parser)
    dataType = dataType[0].replace(':', '')
    newStrings.push("""
    /for/conversion/#{dataType}:
      get:
        responses:
          200:
            body:
              application/json:
                type: #{dataType}""")
  
  # Combine modified and new entries
  dataPieces[0] = """#%RAML 1.0
  types:"""
  dataPieces = dataPieces.concat(newStrings)

  return dataPieces.join('\n')


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
    factory = new TestFactory(config)

    parseHooks = (callback) ->
      addHooks hooks, config.options.hookfiles, callback
      return # NOTREACHED

    loadRAML = (callback) ->
      if !config.ramlPath
        nofile = new Error 'unspecified RAML file'
        return callback nofile

      raml2obj.parse config.ramlPath
        .then (raml) ->
          raml.ramlPath = path.dirname config.ramlPath
          raml.ramlData = fs.readFileSync(config.ramlPath).toString()
          
          # Skip generating webapi model if not required
          if (!config.options.typesfile)
            console.log('Using ramldt2jsonschema (v0.3.1) for RAML parsing')
            return callback null, raml
          
          # Use provided types RAML file to generate a webapi model (for generating datatype schemas)
          console.log """
          Using WebApi-Parser for RAML parsing:
            - Types file should not be a library or have a types node
            - All datatype fragments *MUST* have a fragment identifier ("#%RAML 1.0 DataType")
            - RAML should not have duplicate definitions (e.g. multiple examples for the same type)"""
          patchedRamlTypes = patchRamlTypes(config.options.typesfile)
          location = "file://#{path.resolve process.cwd(), config.options.typesfile}"
          wap.raml10.parse(patchedRamlTypes, location)
          .then (model) ->
            wap.raml10.resolve(model)
            .then (resolved) ->
              raml.webApiModel = resolved
              callback null, raml
        .catch (err) ->
          return callback err
      return # NOTREACHED

    parseTestsFromRAML = (raml, callback) ->
      if !config.options.server
        if raml.baseUri
          config.options.server = raml.baseUri

      try
        addTests raml, tests, hooks, {}, callback, factory, config.options.sorted
      catch err
        console.warn 'error adding tests ' + err
      return # NOTREACHED

    runTests = (callback) ->
      runner = new Runner config.options, config.ramlPath
      #console.log JSON.stringify tests, null, 2
      try
        runner.run tests, hooks, callback
      catch
        console.log 'error running tests ' + err
      return # NOTREACHED

    async.waterfall [
      parseHooks,
      loadRAML,
      parseTestsFromRAML,
      runTests
    ], done
    return



module.exports = Abao

