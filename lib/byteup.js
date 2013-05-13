var bytewise = require('bytewise');

module.exports = function addBytewise() {
  var dbUtil = require('levelup/lib/util');
    var encoders = dbUtil.toSlice;
    encoders['bytewise'] = bytewise.encode.bind(bytewise);
    var decoders = dbUtil.toEncoding;
    decoders['bytewise'] = bytewise.decode.bind(bytewise);
}
