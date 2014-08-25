#!/usr/bin/env node

var crypto = require('crypto');
var fs = require('fs')
var spawn = require('child_process').spawn;
var _ = require('lazy.js');
var jade = require('jade');
var less = require('less');
var browserify = require('browserify');

module.exports = _(module.exports).assign({
  create: create,
  screenshot: screenshot
}).toObject();


function normalize(options, done) {
  if (options.html && /[.]jade/i.test(options.html)) options.html = compileJade(options.html);
  if (options.html && !/[.]html/i.test(options.html)) options.html = saveToTempFile(options.html, '.html');
  if (options.css && /[.]less/i.test(options.css)) return compileLess(options.css, recurse('css'));
  if (options.js && /[.]js/i.test(options.js)) return compileJS(options.js, recurse('js'));
  return done(null, options);
  
  function recurse(key) {
    return function (err, value) {
      if (err) return done(err);
      options[key] = value;
      normalize(options, done);
    };
  }
}

function create(options, done) {
  normalize(options, function (err, _options) {
    if (err) return done(err);
    var args = [__dirname + '/phantomjs/create.js'];
    for (var key in _options) args.push(key + '=' + _options[key].toString());
    var output = '';
    var options = {stdio: [null, 'pipe', 'inherit']};
    var spawned = spawn(__dirname + '/node_modules/phantomjs/bin/phantomjs', args, options);
    var timeout = setTimeout(killProc, 30000);
    spawned.stdout.on('data', function (data) { output += data.toString(); });
    spawned.on('error', finished).on('exit', finished);
    function finished(errOrCode, signal) {
      clearTimeout(timeout);
      if (errOrCode !== 0) return done('Failed with code: ' + errOrCode.toString());
      return done(null, output);
    }
    function killProc() { spawned.kill('SIGTERM'); }
  });
}

function compileJade(path) {
  return saveToTempFile(jade.renderFile(path, {
    filename: path,
    pretty: true,
    debug: false,
    compileDebug: false,
  }), '.html');
}

function compileLess(path, done) {
  var parser = new (less.Parser)({fileName: path});
  var code = fs.readFileSync(path).toString();
  parser.parse(code, function (err, tree) {
    if (err) return done(err);
    return done(null, saveToTempFile(tree.toCSS({compress: false}), '.css'));
  });
}

function compileJS(path, done) {
  var bb = browserify();
  bb.add(path);
  bb.bundle(function (err, body) {
    if (err) return done(err);
    return done(null, saveToTempFile(body, '.html'));
  });
}

function screenshot(options, done) {
  var args = [__dirname + '/phantomjs/screenshot.js'];
  for (var key in options) args.push(key + '=' + options[key].toString());
  var spawned = spawn(__dirname + '/node_modules/phantomjs/bin/phantomjs', args, {stdio: 'inherit'});
  var timeout = setTimeout(killProc, 30000);
  spawned.on('error', finished).on('exit', finished);
  function finished(errOrCode) {
    if (errOrCode !== 0) return done('Failed with code: ' + errOrCode.toString());
    if (!options.trim) return done();
    clearTimeout(timeout);
    spawned = spawn('convert', [options.image, "-fuzz", "10%", "-trim", "+repage",  options.image], {stdio: 'inherit'});
    setTimeout(killProc, 30000);
    spawned.on('error', done).on('exit', done);
  }
  function killProc() { spawned.kill('SIGTERM'); }
}

function makeTemp(ext) {
  ext = ext && (ext[0] == '.' ? ext : ('.' + ext)) || '';
  return '/tmp/jsfiddler-' + crypto.randomBytes(10).toString('hex') + ext;
}

function saveToTempFile(info, ext) {
  try {
    if (fs.readFileSync(info).toString()) return info;
  } catch (ee) {};
  var path = makeTemp(ext);
  fs.writeFileSync(path, info);
  return path;
}

//
// Main
//

function main() {
  var argv = require('minimist')(process.argv.slice(2));
  if (argv.cmd == 'create') {
    delete argv.cmd;
    return create(argv, done);
  }
  if (argv.cmd == 'screenshot') {
    delete argv.cmd;
    return screenshot(argv, done);
  }
  return console.error('Usage: --cmd=create/--cmd=screenshot options.');
  function done(err, data) {
    if (err) {
      console.error('Error: ', err);
      process.exit(1);
    }
    console.log(data);
    process.exit(0);
  }
}

if (require.main === module) return main();
