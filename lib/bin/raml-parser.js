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

parser.loadApi(file, {
  attributeDefaults: false, 
  rejectOnErrors: true
}).then((api) => {
  if (expand && api.expand) api = api.expand(true)
  const json = api.toJSON({serializeMetadata: false});
  console.log(util.stringify(json))
}).catch(util.exit)

/* Using json:
parser.loadApi(file, {
  attributeDefaults: false,
  rejectOnErrors: false
}).then((api) => {

  if (expand && api.expand) api = api.expand(true)

  const json = api.toJSON({
    serializeMetadata: false,
    dumpSchemaContents: false,
    rootNodeDetails: true
  });

  if (json.errors && json.errors.length)
    console.error(util.stringify(json.errors))
  else 
    console.log(util.stringify(json.specification))

}).catch((errors) => {
  console.error(util.stringify(errors))
})
*/
