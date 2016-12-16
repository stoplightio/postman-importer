#!/usr/bin/env node --harmony
const program = require('commander')
const parser = require('raml-1-parser')
const util = require('./util')

let expand = true
let file = undefined

program
  .arguments('<file>')
  .option('-e, --expand <expand>', 'whether to expand (default) or not')
  .action(f => {
    file = f
    if (typeof program.expand !== 'undefined')
      expand = program.expand
  })
  .parse(process.argv)

if (typeof file === 'undefined') util.exit('File path required. See --help.')

parser.loadApi(file, {attributeDefaults: false}).then((api) => {
  if (expand && api.expand) api = api.expand(true)
  var json = api.toJSON({serializeMetadata: false});
  console.log(util.stringify(json))
}).catch(util.exit)