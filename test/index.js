var should = require('should')
  , rimraf = require('rimraf')
  , path = require('path')
  , levelup = require('levelup')
  , _ = require('underscore')
  , async = require('async')
  , byteup = require('../lib/byteup');

describe('byteup', function () {
  var db
    , dbPath = path.join(__dirname, '..', 'test', 'db');

  beforeEach(function (done) {
    byteup();
    rimraf(dbPath, function (err) {
      if (err) done(err);
      db = levelup(dbPath, {
        keyEncoding: 'bytewise',
        valueEncoding: 'json'
      }, function (err) {
        if (err) done(err);
        done();
      });
    });
  });

  afterEach(function (done) {
    db.close(done);
  });

  it('should be able to do #put and #get and #del', function (done) {
    var key = ['hello', 123];
    var value = { name: 'Eugene' };

    db.put(key, value, function (err) {
      if (err) return done(err);
      db.get(key, function (err, value) {
        if (err) return done(err);
        should.exist(value);
        value.name.should.equal('Eugene');
        db.del(key, function (err) {
          db.get(key, function (err) {
            err.name.should.equal('NotFoundError');
            done();
          });
        });
      });
    });
  });

  it('should be able to iterate over a map', function (done) {
    var ops = [];
    var keys = [];
    _.range(0,3).forEach(function (i) {
      _.range(0, 5).forEach(function (j) {
        ops.push({
          type: 'put',
          key: ['word' + i, j],
          value: { name: 'Eugene' + j }
        });
      });
    });

    db.batch(ops, function (err) {
      if (err) return done(err);
      async.series([
        function testKeyValues(cb) {
          db.createReadStream()
            .on('data', function(data) {
              data.key.length.should.equal(2);
              data.key[0].should.match(/word[\d]+/);
              data.key[1].should.be.above(-1);
              data.value.name.should.match(/Eugene[\d]+/);
            })
            .on('end', cb);
        },
        function testKeys(cb) {
          db.createKeyStream()
            .on('data', function(data) {
              data.length.should.equal(2);
              data[0].should.match(/word[\d]+/);
              data[1].should.be.above(-1);
            })
            .on('end', cb);
        },
        function testValues(cb) {
          db.createValueStream()
            .on('data', function(data) {
              data.name.should.match(/Eugene[\d]+/);
            })
            .on('end', cb);
        },
        function testKeyValuesRange(cb) {
          db.createReadStream({
            start: ['word1', -Infinity],
            end: ['word1', +Infinity]
          })
            .on('data', function(data) {
              data.key.length.should.equal(2);
              data.key[0].should.equal('word1');
              data.key[1].should.be.above(-1);
              data.value.name.should.match(/Eugene[\d]+/);
            })
            .on('end', cb);
        },
      ], done);
    });
  });
});
