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

page.viewportSize = {width: 1920, height: 1080};
page.open(phantom.args[0], function (status) {
  if (status !== 'success') {
    stderr('Unable to fetch URL', status);
  } else {
    stderr('Fetched URL');
    page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", once(screenshot));
  }
});

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
    page.render(phantom.args[1], {quality: '90'});
    phantom.exit(0);
  }, 1000);
}
