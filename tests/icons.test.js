'use strict';

/**
 * The workflow icon sprite that ships in the package is generated from the
 * `icon="…"` attributes in the views, so an icon added to a view without
 * re-running the vendor step would render as a blank square. These checks close
 * that gap in both directions: everything the views ask for is in the sprite,
 * and the sprite carries nothing else.
 */

var test = require('node:test');
var assert = require('node:assert');
var fs = require('node:fs');
var path = require('node:path');

var ROOT = path.join(__dirname, '..');
var VIEW_ROOT = path.join(ROOT, 'src', 'view');
var CORAL_ROOT = path.join(VIEW_ROOT, 'coral');
var SPRITE = path.join(CORAL_ROOT, 'spectrum-icons.svg');

var viewSources = function (directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).reduce(function (
    found,
    entry
  ) {
    var entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return entry.name === 'coral'
        ? found
        : found.concat(viewSources(entryPath));
    }

    return /\.(html|js)$/.test(entry.name) ? found.concat(entryPath) : found;
  },
  []);
};

var referencedIcons = function () {
  var names = new Set();

  viewSources(VIEW_ROOT).forEach(function (file) {
    var contents = fs.readFileSync(file, 'utf8');
    var pattern = /\bicon="([A-Za-z][A-Za-z0-9]*)"/g;
    var match = pattern.exec(contents);

    while (match) {
      names.add(match[1]);
      match = pattern.exec(contents);
    }
  });

  return Array.from(names).sort();
};

var spriteMarkup = function () {
  assert.ok(
    fs.existsSync(SPRITE),
    'The vendored icon sprite is missing. Run `npm run vendor`.'
  );

  return fs.readFileSync(SPRITE, 'utf8');
};

/** Icon names the sprite provides, derived from its symbol ids. */
var spriteIcons = function (markup) {
  var names = new Set();
  var pattern = /id="spectrum-icon-\d+-([A-Za-z][A-Za-z0-9]*)"/g;
  var match = pattern.exec(markup);

  while (match) {
    names.add(match[1].charAt(0).toLowerCase() + match[1].slice(1));
    match = pattern.exec(markup);
  }

  return Array.from(names).sort();
};

test('every icon the views use is in the vendored sprite', function () {
  var markup = spriteMarkup();
  var provided = spriteIcons(markup);

  referencedIcons().forEach(function (name) {
    assert.ok(
      provided.indexOf(name) !== -1,
      'the views use icon="' +
        name +
        '" but the sprite does not provide it. Run `npm run vendor`.'
    );
  });
});

test('the vendored sprite carries nothing the views do not use', function () {
  var referenced = referencedIcons();

  assert.deepStrictEqual(
    spriteIcons(spriteMarkup()),
    referenced,
    'the sprite is out of step with the views. Run `npm run vendor`.'
  );

  // Coral ships close to two thousand icons in one file; shipping that whole
  // file is the regression this trimming exists to prevent.
  assert.ok(
    referenced.length < 50,
    'unexpectedly many icons in the sprite — is the full Coral sprite being copied?'
  );
});

test('the views reference at least one icon', function () {
  // A zero-length list would make both checks above pass vacuously.
  assert.ok(referencedIcons().length > 0);
});
