'use strict';

/**
 * The conversion tests cover return values; these cover what the three types
 * tell the debug console on the way out. The case that matters most is a source
 * value that reaches the module intact but matches nothing, since that returns
 * `undefined` and is indistinguishable from a broken data element without a
 * message saying so.
 */

var test = require('node:test');
var assert = require('node:assert');

var toBoolean = require('../src/lib/dataElements/stringToBoolean');
var toInteger = require('../src/lib/dataElements/stringToInteger');
var toDouble = require('../src/lib/dataElements/stringToDouble');

/** Runs `convert` with a stub `turbine`, returning what it logged. */
var captureLogs = function (convert) {
  var calls = [];
  var record = function (level) {
    return function (message) {
      calls.push({ level: level, message: message });
    };
  };

  global.turbine = {
    logger: {
      debug: record('debug'),
      log: record('log'),
      info: record('info'),
      warn: record('warn'),
      error: record('error')
    }
  };

  try {
    convert();
  } finally {
    delete global.turbine;
  }

  return calls;
};

var BOOLEAN_DEFAULTS = {
  trimWhitespace: true,
  caseSensitive: false,
  unmatchedBehavior: 'omit',
  emptyBehavior: 'omit',
  nullBehavior: 'omit'
};

var settings = function (base, overrides) {
  var merged = {};

  Object.keys(base).forEach(function (key) {
    merged[key] = base[key];
  });
  Object.keys(overrides).forEach(function (key) {
    merged[key] = overrides[key];
  });

  return merged;
};

test('an unmatched value warns, and says what was dropped and why', function () {
  var calls = captureLogs(function () {
    assert.strictEqual(
      toBoolean(settings(BOOLEAN_DEFAULTS, { sourceValue: 'maybe' })),
      undefined
    );
  });

  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].level, 'warn');
  assert.match(calls[0].message, /String to Boolean/);
  assert.match(calls[0].message, /"maybe"/);
  assert.match(calls[0].message, /neither the true nor the false list/);
  assert.match(calls[0].message, /unmatchedBehavior "omit" returned undefined/);
  assert.match(calls[0].message, /left out of the payload/);
});

test('a data element name typed without percent signs reports as unmatched', function () {
  // The mistake the message exists to catch: `loggedIn` instead of %loggedIn%
  // saves cleanly, arrives as a literal string, and matches nothing.
  var calls = captureLogs(function () {
    toBoolean(settings(BOOLEAN_DEFAULTS, { sourceValue: 'loggedIn' }));
  });

  assert.strictEqual(calls[0].level, 'warn');
  assert.match(calls[0].message, /"loggedIn" is in neither/);
});

test('a successful match logs at debug rather than warn', function () {
  var calls = captureLogs(function () {
    assert.strictEqual(
      toBoolean(settings(BOOLEAN_DEFAULTS, { sourceValue: 'YES' })),
      true
    );
  });

  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].level, 'debug');
  assert.match(calls[0].message, /matched the true list/);
});

test('a missing source value names nullBehavior, not unmatchedBehavior', function () {
  var calls = captureLogs(function () {
    toBoolean(settings(BOOLEAN_DEFAULTS, { sourceValue: undefined }));
  });

  assert.strictEqual(calls[0].level, 'warn');
  assert.match(calls[0].message, /no value to convert/);
  assert.match(calls[0].message, /nullBehavior/);
  assert.doesNotMatch(calls[0].message, /unmatchedBehavior/);
});

test('an empty source value names emptyBehavior', function () {
  var calls = captureLogs(function () {
    toBoolean(settings(BOOLEAN_DEFAULTS, { sourceValue: '   ' }));
  });

  assert.strictEqual(calls[0].level, 'warn');
  assert.match(calls[0].message, /empty or whitespace-only/);
  assert.match(calls[0].message, /emptyBehavior/);
});

test('the numeric types report parsed values and unparseable ones', function () {
  var parsed = captureLogs(function () {
    assert.strictEqual(
      toInteger({ sourceValue: '12.7', decimalHandling: 'round' }),
      13
    );
  });

  assert.strictEqual(parsed[0].level, 'debug');
  assert.match(parsed[0].message, /String to Integer/);
  assert.match(parsed[0].message, /parsed "12\.7".*returned 13/);

  var invalid = captureLogs(function () {
    assert.strictEqual(
      toDouble({ sourceValue: 'abc', invalidBehavior: 'null' }),
      null
    );
  });

  assert.strictEqual(invalid[0].level, 'warn');
  assert.match(invalid[0].message, /String to Double/);
  assert.match(invalid[0].message, /"abc" is not a number/);
  assert.match(invalid[0].message, /invalidBehavior "null" returned null/);
});

test('a boolean passed straight through is distinguishable from a string', function () {
  var calls = captureLogs(function () {
    assert.strictEqual(
      toBoolean(settings(BOOLEAN_DEFAULTS, { sourceValue: true })),
      true
    );
  });

  assert.strictEqual(calls[0].level, 'debug');
  assert.match(calls[0].message, /boolean true/);
});

test('conversions still work with no runtime logger present', function () {
  assert.strictEqual(typeof global.turbine, 'undefined');

  assert.strictEqual(
    toBoolean(settings(BOOLEAN_DEFAULTS, { sourceValue: 'yes' })),
    true
  );
  assert.strictEqual(toInteger({ sourceValue: '42' }), 42);
  assert.strictEqual(toDouble({ sourceValue: '1.5' }), 1.5);
});
