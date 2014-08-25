//
// This creates a new JS Fiddle based on arguments.
// Expected arguments:
//
//   If there is a json file, it will assume that file contains all the defaults
//   Any .html file path will be considered the html part.
//   Any .js files will be considered part of the JS.  You can include multiple of those.
//   Any .less or .css files will be considered part of the CSS
//   Parameters can also be explicitly provided via html= etc.  Here is the full set of possible parameters:
//     html, css, js, link (resources), script (resources), title, description, normalize_css, dtd, wrap
//     where dtd = boolean and wrap = l (onLoad), d = (domReady), h (no wrap, in <head>), b (no wrap, in <body>)
//

var page = require('webpage').create();
var fs = require('fs');
var querystring = require('querystring');
var system = require('system');

var stderr = function () {
  system.stderr.writeLine(Array.prototype.slice.call(arguments, 0).join(' '));
};

var params = ['html', 'css', 'js', 'link', 'script', 'title', 'description', 'normalize_css', 'dtd', 'wrap', 'json', 'png', 'jpeg', 'slug', 'version'];
var extensions = {
  'html': 'html',
  'css': 'css',
  'json': 'json',
  'less': 'css',
  'jade': 'html'
};

var args = {};
phantom.args.forEach(function (arg) {
  params.forEach(function (key) {
    if ((new RegExp('^' + key + '=', 'i')).test(arg)) {
      args[key] = arg.replace(new RegExp('^' + key + '=', 'i'), ''); 
      arg = '';
      return false;
    }
  });
  if (!arg) return;
  for (var key in extensions) {
    var val = extensions[key];
    if ((new RegExp('[.]' + key + '$', 'i')).test(arg)) {
      args[val] = arg;
      arg = '';
      break;
    }
  }
});

if (args.json) {
  var json = JSON.parse(require('fs').read(args.json));
  for (var key in args) json[key] = args[key];
  args = json;
}

function readFile(key) {
  if (!args[key]) {
    args[key] = '';
    return;
  }
  try {
    args[key] = fs.read(args[key]);
  } catch (e) {
    stderr('Could not read ' + key + ' so assuming it is inlined.');
  }
}

readFile('html');
readFile('css');
readFile('js');

var data = {
  html: args.html || undefined,
  css: args.css || undefined,
  js: args.js || undefined,
  resources: [args.link || '', args.script || ''].join(',').replace(/(^,|,$)/g, '') || undefined,
  title: args.title || undefined,
  description: args.description || undefined,
  normalize_css: JSON.parse(args.normalize_css || 'false') ? 'yes' : 'no',
  dtd: args.dtd || undefined,
  wrap: args.wrap || 'b',
  slug: args.slug || undefined,
  version: args.version || undefined
};
  
stderr('params', JSON.stringify(data));

page.open(args.url || 'http://jsfiddle.net/api/post/library/pure/', 'post', querystring.stringify(data), function (status) {
  if (status !== 'success') {
    stderr('unable to post!');
  } else {
    stderr('OK, posted successfully.  URL = ', page.url)
    savePage();
  }
});


function savePage() {
  var oldUrl = page.url;
  var clicked = page.evaluate(function () {
    var event = document.createEvent('MouseEvents');
    event.initMouseEvent('click', true, window, 1, 0, 0);
    var elt = document.querySelectorAll('#savenew')[0];
    if (elt) elt.dispatchEvent(event);
    return !!elt;
  });

  if (clicked) return getFiddleURL(oldUrl);
  stderr('No clicks yet, so trying again in a second', oldUrl, clicked);
  setTimeout(savePage, 1000);
}

function getFiddleURL(oldUrl) {
  if (page.url == oldUrl) {
    stderr('page has not loaded yet, waiting a second', oldUrl);
    return setTimeout(function () { getFiddleURL(oldUrl); }, 1000);
  } else {
    stderr("Page has loaded");
    stderr('URL = ', page.url);
    console.log(page.url);
    phantom.exit(0);
  }
}
