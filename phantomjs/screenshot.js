//
// Screenshot a fiddle result.  Two args expected -- fiddle URL and page file path
// 

var page = require('webpage').create();
var fs = require('fs');
var system = require('system');

var stderr = function () {
  system.stderr.writeLine(Array.prototype.slice.call(arguments, 0).join(' '));
};

function once(fn) {
  var onced = false;
  return function () {
    if (onced) return;
    onced = true;
    return fn.apply(this, Array.prototype.slice.call(arguments, 0));
  };
}

var params = ['url', 'image', 'quality'];
var args = {};
phantom.args.forEach(function (arg) {
  params.forEach(function (key) {
    if ((new RegExp('^' + key + '=', 'i')).test(arg)) {
      args[key] = arg.replace(new RegExp('^' + key + '=', 'i'), ''); 
      arg = '';
      return false;
    }
  });
});

page.viewportSize = {width: 1920, height: 1080};
page.open(args.url, function (status) {
  if (status !== 'success') {
    stderr('Unable to fetch URL', status);
  } else {
    stderr('Fetched URL');
    ensureJQuery(screenshot);
  }
});

function ensureJQuery(callback) {
  var needsJQuery = page.evaluate(function () { return !window.jQuery; });
  if (!needsJQuery) return callback();
  page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", once(callback));
}

function screenshot() {
  stderr('waiting a few seconds before screentshotting');
  setTimeout(function () {
    stderr('Screenshotting');
    page.clipRect = page.evaluate(function () {
      var iframe = $('#result iframe');
      return {
      top: iframe.offset().top, left: iframe.offset().left,
        width: iframe.outerWidth(), height: iframe.outerHeight()
      };
    });
    stderr('Clip rect =', JSON.stringify(page.clipRect));
    page.render(args.image, {quality: args.quality || '90'});
    phantom.exit(0);
  }, 3000);
}
