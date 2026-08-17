'use strict';

/**
 * Adobe serves the unpacked extension package from
 * assets.adobedtm.com/extensions/<packageId>/, but it does not serve all of it:
 * a file one directory below `src/view` is served, and anything in a deeper
 * tree is dropped without warning. The package that shipped Coral at
 * `src/view/vendor/coral/dist/js/coral.min.js` uploaded cleanly, passed
 * `reactor-validator`, and worked in the sandbox — then 404ed on every Coral
 * file once opened in the Data Collection UI, leaving the views with no
 * stylesheet and no component runtime.
 *
 * Nothing local reproduces that: the sandbox serves the whole tree happily. So
 * these checks encode the hosting constraint instead — every view asset stays
 * shallow, and every path a view references actually exists.
 */

var test = require('node:test');
var assert = require('node:assert');
var fs = require('node:fs');
var path = require('node:path');

var ROOT = path.join(__dirname, '..');
var VIEW_ROOT = path.join(ROOT, 'src', 'view');

/**
 * The deepest layout Adobe was observed to serve: `src/view/<directory>/<file>`.
 * A file sitting directly in `src/view` is shallower still, so two path
 * segments is the ceiling.
 */
var MAX_SEGMENTS = 2;

var VIEWS = ['stringToBoolean', 'stringToInteger', 'stringToDouble'];

/** Every file under src/view, as a path relative to it. */
var viewFiles = function (directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).reduce(function (
    found,
    entry
  ) {
    var entryPath = path.join(directory, entry.name);

    return found.concat(
      entry.isDirectory() ? viewFiles(entryPath) : [path.relative(VIEW_ROOT, entryPath)]
    );
  },
  []);
};

var readView = function (name) {
  return fs.readFileSync(
    path.join(VIEW_ROOT, 'dataElements', name + '.html'),
    'utf8'
  );
};

/** Relative href/src values in a view, ignoring anything absolute. */
var localReferences = function (html) {
  var found = [];
  var pattern = /(?:href|src)="([^"]+)"/g;
  var match = pattern.exec(html);

  while (match) {
    if (!/^(?:https?:)?\/\//.test(match[1])) {
      found.push(match[1]);
    }

    match = pattern.exec(html);
  }

  return found;
};

test('no view asset is nested deeper than Adobe will serve', function () {
  var files = viewFiles(VIEW_ROOT);

  assert.ok(files.length > 0, 'no files found under src/view');

  files.forEach(function (file) {
    assert.ok(
      file.split(path.sep).length <= MAX_SEGMENTS,
      'src/view/' +
        file +
        ' is too deeply nested to be served from an uploaded package. ' +
        'Keep view assets at src/view/<directory>/<file>.'
    );
  });
});

test('every path a view references exists', function () {
  VIEWS.forEach(function (name) {
    var viewDirectory = path.join(VIEW_ROOT, 'dataElements');

    localReferences(readView(name)).forEach(function (reference) {
      var target = path.resolve(viewDirectory, reference);

      assert.ok(
        fs.existsSync(target),
        name + ' references ' + reference + ', which does not exist. ' +
          'Run `npm run vendor` if this is a Coral file.'
      );
      assert.ok(
        target.indexOf(VIEW_ROOT) === 0,
        name + ' references ' + reference + ', which is outside src/view and ' +
          'will not be served.'
      );
    });
  });
});

test('every view points Coral at the flattened sprite location', function () {
  VIEWS.forEach(function (name) {
    var html = readView(name);
    var script = /<script\b[^>]*coral\.min\.js[^>]*>/.exec(html);

    assert.ok(script, name + ' does not load coral.min.js');

    // Coral resolves its sprites by walking up from its own script URL, which
    // assumes the dist/js + dist/resources layout it ships with. Flattening
    // breaks that inference, and data-coral-icons is what replaces it: Coral
    // reads the attribute off its own script element.
    var icons = /data-coral-icons="([^"]+)"/.exec(script[0]);

    assert.ok(
      icons,
      name +
        ' loads coral.min.js without data-coral-icons, so every icon will ' +
        'resolve against a dist/resources path that is not in the package.'
    );

    var spritePath = path.resolve(
      VIEW_ROOT,
      'dataElements',
      icons[1],
      'spectrum-icons.svg'
    );

    assert.ok(
      fs.existsSync(spritePath),
      name +
        ' points data-coral-icons at ' +
        icons[1] +
        ', where spectrum-icons.svg is not. Run `npm run vendor`.'
    );
  });
});
