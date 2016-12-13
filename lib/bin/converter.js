#!/usr/bin/env node --harmony
const program = require('commander')
const formats = require('../formats')
const specConverter = require('../../index')

let from = formats.AUTO
let to = formats.RAML10
let validate = false
let file = undefined

const exit = (error) => {
  console.error(error)
  process.exit(1)
}

program
  .arguments('<file>')
  .option('-f, --from <from>', 'the from/input spec, valid values are: swagger, raml08, raml10 and auto (default)')
  .option('-t, --to <to>', 'the to/target spec, valid values are: swagger, raml08 and raml10 (default)')
  .option('-v, --validate <validate>', 'true to validate the output (defaults to false)')
  .action(f => {
    file = f
    if (typeof program.from !== 'undefined') {
      from = formats[program.from.toUpperCase()]
      if (typeof from === 'undefined') exit('Invalid --from spec given. See --help.')
    }
    if (typeof program.to !== 'undefined') {
      to = formats[program.to.toUpperCase()]
      if (typeof to === 'undefined') exit('Invalid --to spec given. See --help.')
    }
    if (typeof program.validate !== 'undefined') {
      validate = program.validate
    }
  })
  .parse(process.argv)

if (typeof file === 'undefined') exit('File path required. See --help.')

const converter = new specConverter.Converter(from, to)
converter.loadFile(file).then(() => {
  const format = to.formats[0].toLowerCase()
  converter.convert(format, {validate: validate}).then(result =>
    console.log(result)
  ).catch(exit)
}).catch(exit)
