#!/usr/bin/env node --harmony
const program = require('commander');
const formats = require('./lib/formats');
const specConverter = require('./index');
let file;
let from;
let to;

program
  .arguments('<file>')
  .option('-f, --from <from>', 'The from/input format, valid values are: swagger, raml08, raml10 and auto (default)')
  .option('-t, --to <to>', 'The to/target format, valid values are: swagger, raml08 and raml10 (default)')
  .action(f=> {
    file = f;
    from = formats[(program.from || 'auto').toUpperCase()];
    to = formats[(program.to || 'raml10').toUpperCase()];
  })
  .parse(process.argv);

const exit = (error) => {
  console.error(error);
  process.exit(1);
};

if (typeof to === 'undefined') {
  exit('Empty or invalid to format given. See --help.');
}

const converter = new specConverter.Converter(from, to);
converter.loadFile(file, ()=> {
  const format = to.formats[0].toLowerCase();
  converter.convert(format).then(result=>
    console.log(result)
  ).catch(err=>
    exit(err)
  );
});