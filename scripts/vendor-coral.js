#!/usr/bin/env node
'use strict';

/**
 * Copies the Coral Spectrum runtime out of node_modules and into the view
 * directory, so the packaged extension carries its own copy of the design
 * system rather than loading it from a CDN.
 *
 * The workflow icon sprite is not copied wholesale. Coral ships close to two
 * thousand icons in one file, and the views reference a handful, so the sprite
 * is rebuilt here from the `icon="…"` attributes the views actually use. That
 * is most of the packaged size: the full sprite alone is 319 KB gzipped, and
 * trimming it takes the package from roughly 790 KB to 433 KB.
 *
 * Runs automatically after `npm install`, before `npm test`, and before
 * `npm run sandbox` / `npm run package`. The output is build output and is not
 * committed.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const viewRoot = path.join(projectRoot, 'src', 'view');
const coralDist = path.join(
  projectRoot,
  'node_modules',
  '@adobe',
  'coral-spectrum',
  'dist'
);
// Coral derives the location of its icon sprites from the URL of coral.min.js,
// expecting the layout it ships with: <root>/dist/js/coral.min.js alongside
// <root>/dist/resources. Vendoring into any other shape breaks every icon, so
// the `dist` level is preserved here deliberately.
const destination = path.join(
  projectRoot,
  'src',
  'view',
  'vendor',
  'coral',
  'dist'
);

const WORKFLOW_SPRITE = 'resources/spectrum-icons.svg';

// Copied as-is. The dist directory also carries documentation, coverage, and
// playground folders that have no place in the package.
//
// spectrum-css-icons.svg holds the small UI glyphs Coral draws itself — the
// select chevron, the checkbox checkmark, the tag remove cross, the alert
// triangle — so all of it is needed. spectrum-icons-color.svg is requested at
// load whether or not a color icon is used, so it stays too rather than trade
// 25 KB for a console 404.
const files = [
  'css/coral.min.css',
  'js/coral.min.js',
  'resources/spectrum-css-icons.svg',
  'resources/spectrum-icons-color.svg'
];

if (!fs.existsSync(coralDist)) {
  console.error(
    'Coral Spectrum is not installed. Run `npm install` before packaging.'
  );
  process.exit(1);
}

/** Every file in the view directory that could reference an icon. */
const viewSources = function (directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).reduce(function (
    found,
    entry
  ) {
    var entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      // The vendored copy is output, not source.
      return entry.name === 'vendor' ? found : found.concat(viewSources(entryPath));
    }

    return /\.(html|js)$/.test(entry.name) ? found.concat(entryPath) : found;
  },
  []);
};

/** Icon names the views ask Coral for, as they appear in `icon="…"`. */
const referencedIcons = function () {
  const names = new Set();

  viewSources(viewRoot).forEach(function (file) {
    const contents = fs.readFileSync(file, 'utf8');
    const pattern = /\bicon="([A-Za-z][A-Za-z0-9]*)"/g;
    let match = pattern.exec(contents);

    while (match) {
      names.add(match[1]);
      match = pattern.exec(contents);
    }
  });

  return Array.from(names).sort();
};

/**
 * Rebuilds the workflow sprite with only the requested icons. Coral names the
 * symbols `spectrum-icon-<size>-<Name>`, where `<Name>` is the `icon` attribute
 * with a capitalized first letter, and ships one symbol per size.
 */
const buildSprite = function (iconNames) {
  const source = fs.readFileSync(path.join(coralDist, WORKFLOW_SPRITE), 'utf8');
  const root = source.slice(0, source.indexOf('>') + 1);
  const symbols = [];
  const missing = [];

  iconNames.forEach(function (name) {
    const id = name.charAt(0).toUpperCase() + name.slice(1);
    const matches = source.match(
      new RegExp('<symbol id="spectrum-icon-\\d+-' + id + '"[\\s\\S]*?</symbol>', 'g')
    );

    if (matches) {
      symbols.push.apply(symbols, matches);
    } else {
      missing.push(name);
    }
  });

  if (missing.length) {
    console.error(
      'These icons are used in the views but do not exist in Coral: ' +
        missing.join(', ') +
        '.\nCheck the spelling against https://spectrum.adobe.com/page/icons/.'
    );
    process.exit(1);
  }

  return { markup: root + symbols.join('') + '</svg>', count: symbols.length };
};

files.forEach(function (file) {
  const target = path.join(destination, file);

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(coralDist, file), target);
});

const icons = referencedIcons();
const sprite = buildSprite(icons);
const spriteTarget = path.join(destination, WORKFLOW_SPRITE);

fs.mkdirSync(path.dirname(spriteTarget), { recursive: true });
fs.writeFileSync(spriteTarget, sprite.markup);

const version = require(path.join(
  projectRoot,
  'node_modules',
  '@adobe',
  'coral-spectrum',
  'package.json'
)).version;

fs.writeFileSync(
  path.join(destination, '..', 'README.md'),
  [
    '# Vendored Coral Spectrum',
    '',
    `Copied from \`@adobe/coral-spectrum\` ${version} by \`scripts/vendor-coral.js\`.`,
    '',
    '`resources/spectrum-icons.svg` is not Coral\'s copy: it is rebuilt with only',
    'the icons the views reference. Everything else is verbatim.',
    '',
    'Do not edit these files, and do not commit them: they are regenerated by',
    '`npm install`, `npm test`, `npm run sandbox`, and `npm run package`.',
    ''
  ].join('\n')
);

console.log(
  'Vendored Coral Spectrum ' +
    version +
    ' into src/view/vendor/coral (' +
    (files.length + 1) +
    ' files, workflow sprite trimmed to ' +
    sprite.count +
    ' symbols for: ' +
    (icons.join(', ') || 'no icons') +
    ').'
);
