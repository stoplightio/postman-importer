#!/usr/bin/env node --harmony
const program = require('commander');
const formats = require('./lib/formats');
const specConverter = require('./index');

let from = formats.AUTO;
let to = formats.RAML10;
let file = undefined;

program
  .arguments('<file>')
  .option('-f, --from <from>', 'The from/input spec, valid values are: swagger, raml08, raml10 and auto (default)')
  .option('-t, --to <to>', 'The to/target spec, valid values are: swagger, raml08 and raml10 (default)')
  .action(f=> {
    file = f;
    from = !program.from ? from : formats[program.from.toUpperCase()];
    to = !program.to ? to : formats[program.to.toUpperCase()];
  })
  .parse(process.argv);

const exit = (error) => {
  console.error(error);
  process.exit(1);
};

if (typeof file === 'undefined') exit('File path required. See --help.');
if (typeof from === 'undefined') exit('Invalid --from spec given. See --help.');
if (typeof to === 'undefined') exit('Invalid --to spec given. See --help.');

const converter = new specConverter.Converter(from, to);
converter.loadFile(file, (err)=> {
  if (err) exit(err);

  const format = to.formats[0].toLowerCase();
  converter.convert(format).then(result=>
    console.log(result)
  ).catch(exit);
});