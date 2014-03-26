var should = require('should')
  , async = require('async')

module.exports = function(name, engineFactory) {

  describe(name, function() {

    it('should have a uber-cache compatibility version', function() {
      engineFactory().uberCacheVersion.should.not.equal(undefined)
    })

    describe('#set()', function() {
      it('should not allow undefined key', function(done) {
        var cache = engineFactory()

        cache.set(undefined, null, function(err) {
          err.should.have.property('message', 'Invalid key undefined')
          done()
        })

      })
      it('should not allow values that cannot be JSON.stringify\'d', function(done) {
        var cache = engineFactory()
          , circular = []

        circular.push(circular)

        cache.set('key', circular, function(err) {
          err.should.be.instanceOf(TypeError)
          err.should.have.property('message', 'Converting circular structure to JSON')

          cache.get('key', function(err, value) {
            should.equal(value, undefined)
            done()
          })
        })
      })
    })

    describe('#get()', function() {

      it('should emit a "miss" event on cache misses', function(done) {
        var cache = engineFactory()

        cache.on('miss', function(key) {
          key.should.equal('undefined')
          done()
        })

        cache.get('undefined', function() { })
      })

      it('should emit a "stale" on an expired cache', function(done) {
        var cache = engineFactory()
        if (cache.hasOwnProperty('staleDisabled') && cache.staleDisabled) {
          done();
          return;
        }

        cache.on('stale', function (key, value, ttl) {
          key.should.equal('abc')
          value.should.equal('hello')
          ttl.should.be.below(Date.now())
          done()
        })

        cache.set('abc', 'hello', 30, function() {
          cache.get('abc', function() {
            setTimeout(function() {
              cache.get('abc', function(error, value) {
                should.equal(value, undefined)
              })
            }, 50)
          })
        })
      })

      it('should return undefined for a key that has not been set', function(done) {
        var cache = engineFactory()
        cache.get('test', function(error, value) {
          should.equal(value, undefined)
          done()
        })
      })

      it('should return value via callback', function(done) {
        var cache = engineFactory()
        cache.set('test', 'hello', function(error) {
          true.should.equal(error === null, error && error.message)
          setTimeout(function() {
            cache.get('test', function(error, value) {
              value.should.eql('hello')
              done()
            })
          }, 1000)
        })
      })

      it('should not return a value for a key that has been cleared', function(done) {
        var cache = engineFactory()
        cache.set('test', 'hello')
        cache.del('test', function () {
          cache.get('test', function(error, value) {
            should.equal(value, undefined)
            done()
          })
        })
      })

      it('should return a value when within the TTL', function() {
        var cache = engineFactory()
        cache.set('test', 'hello', 20, function(err) {
          if (err) throw err;
          cache.get('test', function(error, value) {
            value.should.eql('hello')
          })
        })
      })

      it('should not return when TTL has been exceeded', function(done) {
        var cache = engineFactory()
        cache.set('test2', 'hello', 1, function() {
          setTimeout(function() {
            cache.get('test2', function(error, value) {
              should.equal(value, undefined)
              done()
            })
          }, 1000)
        })
      })
    })

    describe('#del()', function() {
      it('should not error if key does not exist', function() {
        var cache = engineFactory()
        cache.del('')
      })
      it('should reduce size of cache', function(done) {
        var cache = engineFactory()
        async.series([
          async.apply(cache.set, 'a', 1),
          function(cb) {
            cache.size(function(error, size) {
              size.should.eql(1)
              cb()
            })
          },
          async.apply(cache.del, 'a'),
          function(cb) {
            cache.size(function(error, size) {
              size.should.eql(0)
              cb()
            })
          }
        ], function() {
          done()
        })
      })
    })

    describe('#size()', function() {
      it('should return 0 before anything has been added to the cache', function() {
        var cache = engineFactory()
        cache.size(function(error, size) {
          size.should.eql(0)
        })
      })

      it('should return 1 after something has been added to the cache', function(done) {
        var cache = engineFactory()
        cache.set('test', 'hello', function() {
          cache.size(function(error, size) {
            size.should.eql(1)
            done()
          })
        })
      })

      it('should return 0 after clear', function(done) {
        var cache = engineFactory()
        cache.set('test', 'hello', 1, function() {
          cache.clear(function() {
            cache.size(function(error, size) {
              size.should.eql(0)
              done()
            })
          })
        })
      })
    })
  })
}
