var bytewise = require('bytewise')
  , Stream = require('stream');

module.exports = function byteup(levelup) {
  function patch(name) {
    var old = levelup[name];
    levelup[name] = function() {
      var args = Array.prototype.slice.call(arguments);
      if (args.length) {
        args[0] = bytewise.encode(args[0]);
      }
      return old.apply(this, args);
    };
  }

  ['put', 'get', 'del'].forEach(patch);

  function patchBatch() {
    var old = levelup.batch;
    levelup.batch = function() {
      var args = Array.prototype.slice.call(arguments);
      if (args.length) {
        var ops = args[0].map(function (op) {
          op.key = bytewise.encode(op.key);
          return op;
        });
        args[0] = ops;
      }
      return old.apply(this, args);
    };
  }

  patchBatch();

  function patchCreateStream(variant) {
    var fn = 'create' + variant + 'Stream';
    var old = levelup[fn];

    levelup[fn] = function() {
      var args = Array.prototype.slice.call(arguments);
      if (args.length) {
        opts = args[0];
        ['start', 'end'].forEach(function (prop) {
          if (args[0][prop]) {
            args[0][prop] = bytewise.encode(args[0][prop]);
          }
        });
      }

      var rs = old.apply(this, args);
      var opts = rs._options;

      var s = new Stream;
      s.readable = true;
      s.writable = true;

      s.write = function (data) {
        if (opts.keys && opts.values) {
          data.key = bytewise.decode(data.key);
        } else if (opts.keys) {
          data = bytewise.decode(data);
        }
        s.emit('data', data);
      };

      s.end = function (data) {
        if (arguments.length) s.write(data);
        s.writeable = false;
        s.emit('end', data);
      };

      s.destroy = function () {
        s.writeable = false;
      };

      rs.pipe(s);

      return s;
    };
  }

  ['Read', 'Key', 'Value'].forEach(patchCreateStream);

  return levelup;
}
