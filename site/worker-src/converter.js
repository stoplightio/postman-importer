var converter = require('../../index');

self.addEventListener('message', function (e) {
    var message = e.data;

    var conv = new converter.Converter(message.fromLanguage, message.toLanguage);

    conv.loadData(message.rawData).then(function (success) {
        conv.convert(message.format.toLowerCase()).then(function (success) {
            self.postMessage({
                type: 'ok',
                convertedData: typeof success === "string" ? success : JSON.stringify(success.info, null, 2)
            });
        }, function (error) {
            self.postMessage({type: 'error', convertedData: error.message});
        });
    }, function (error) {
        self.postMessage({type: 'error', convertedData: error.message});
    });
}, false);