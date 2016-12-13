const Converter = require('../../index').Converter

const stringify = (data) => {
  if (typeof data === 'string') return data
  const result = JSON.stringify(data, null, 2);
  return result === '{}' ? '' : result;
}

const resolve = (error, result) => {
  self.postMessage({
    result: !result ? '' : stringify(result.info || result),
    error: !error ? '' : stringify(error),
    message: !error ? '' : error.message
  })
}

self.addEventListener('message', (e) => {
  const message = e.data
  const format = message.format.toLowerCase();
  const converter = new Converter(message.fromLanguage, message.toLanguage)

  converter.loadData(message.rawData).then(() => {
    converter.convert(format, {validate: true}).then((success) =>
      resolve(null, success)
    ).catch((error) => {
      // if an error is found, try to retrieve the invalid output
      converter.convert(format, {validate: false}).then((success) =>
        resolve(error, success)
      ).catch(resolve)
    })
  }).catch(resolve)

}, false)