var _ = require('lazy.js');
var spawn = require('child_process').spawn;

module.exports = _(module.exports).assign({
  create: createPhantomJSStub(__dirname + '/phantomjs/create.js'),
  screenshot: createPhantomJSStub(__dirname + '/phantomjs/screenshot.js')
}).toObject();

function createPhantomJSStub(phantomJSFileName) {
  return function process(args, fn) {
    var done = (typeof(fn) == 'function') && fn;
    
    if (Array.isArray(args)) {
    } else if (typeof(args) == 'object') {
      args = _(args).map(function (val, key) { return [key, stringify(value)].join('='); }).value();
    } else {
      args = Array.prototype.slice.call(arguments, 0);
    }
    
    if (typeof(args.slice(-1)[0]) == 'function') done = args.pop();

    var spawned = spawn(
      __dirname + '/node_modules/phantomjs/bin/phantomjs', 
      [phantomJSFileName].concat(args),
      {stdio: 'inherit'}
    ).on('exit', onClosed).on('error', onClosed);
    var timer = setTimeout(onClosed, 10000);
    
    function onClosed(code) {
      if (typeof(code) == 'undefined') {
        console.error('Sorry, looks like phantomJS has hung, killing it');
        spawned.kill('SIGKILL');
        return finished('killed');
      }
      if (code !== 0) return finished(code);
      return finished();
    }
    
    function finished(err) {
      var cb = done;
      done = null;
      return cb && cb(err);
    }
    
    function stringify(xx) {
      if (typeof(xx) == 'string') return xx;
      return JSON.stringify(xx);
    }
  }
}

function main() {
  var argv = require('minimist')(process.argv.slice(2));
  if (argv.create) {
    delete argv.create;
    if (argv._.length) return module.exports.create(argv._, done);
    delete argv._;
    if (JSON.stringify(argv) != '{}') return module.exports.create(argv, done);
    return console.error('Did not specify any parameters.');
  }
  if (argv.screenshot) {
    var doTrim = JSON.parse(argv.trim);
    delete argv.screenshot;
    delete argv.trim;
    if (argv._.length) return module.exports.screenshot(argv._, doTrim ? trim : done);
    delete argv._;
    if (JSON.stringify(argv) != '{}') return module.exports.screenshot(argv, doTrim ? trim : done);
    return console.error('Did not specify any parameters.');
  }
  return console.error('Usage: --create/--screenshot args');
  function done(err) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  }
  function trim(err) {
    if (err) return done(err);
    spawn(
      'convert', 
      [argv._[1]].concat("-fuzz 10% -trim +repage".split(' ').concat([argv._[1]])),
      {stdio: 'inherit'}
    ).on('error', done).on('exit', done);
  }
}

if (require.main === module) return main();
