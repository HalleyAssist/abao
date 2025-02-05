/**
 * @file Description
 */

const Abao = require('./abao'),
      util = require('util')

class main{
    constructor(options = {}){
        this._options = options
    }

    _parseOptions(options = {}){
        // Convert options to CLI format
        const args = []
        if (options.ramlfile)
            args.push(options.ramlfile)
        if (options.hookfiles)
            args.push(`--hookfiles=${options.hookfiles}`)
        if (options.sorted)
            args.push(`--sorted=true`)
        if (options.typesfile)
            args.push(`--typesfile=${options.typesfile}`)
        if (options.timeout)
            args.push(`--timeout=${options.timeout}`)

        return require('./cli').parseArgs(args);
    }

    async run(){
        const parsedOptions = this._parseOptions(this._options)
        const abao = new Abao(parsedOptions)

        // Run Abao test
        const runTest = util.promisify(function fn(abao, callback){
            abao.run((error, nfailures) => {
                if (error || nfailures)
                    callback(new Error('Abao test failed'))
                else
                    callback(null, true)
            })
        })
        await runTest(abao)
    }
}


module.exports = main;

