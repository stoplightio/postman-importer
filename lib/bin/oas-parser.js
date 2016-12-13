#!/usr/bin/env node --harmony
const program = require('commander')
const parser = require('swagger-parser')

let file = undefined

const exit = (error) => {
  console.error(error)
  process.exit(1)
}

program
  .arguments('<file>')
  .action(f => {
    file = f
  })
  .parse(process.argv)

if (typeof file === 'undefined') exit('File path required. See --help.')

parser.validate(file).then(() => {
  parser.parse(file)
    .then((api) => console.log(api))
    .catch(exit)
}).catch(exit)