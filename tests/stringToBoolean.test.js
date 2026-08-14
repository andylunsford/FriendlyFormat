'use strict';

var test = require('node:test');
var assert = require('node:assert');

var stringToBoolean = require('../src/lib/dataElements/stringToBoolean');

test('recognizes the default true values', function () {
  ['true', 'TRUE', 'yes', 'y', '1', 'on', 't'].forEach(function (value) {
    assert.strictEqual(stringToBoolean({ sourceValue: value }), true, value);
  });
});

test('recognizes the default false values', function () {
  ['false', 'FALSE', 'no', 'n', '0', 'off', 'f'].forEach(function (value) {
    assert.strictEqual(stringToBoolean({ sourceValue: value }), false, value);
  });
});

test('trims surrounding whitespace by default', function () {
  assert.strictEqual(stringToBoolean({ sourceValue: '  true  ' }), true);
});

test('leaves whitespace in place when trimming is disabled', function () {
  assert.strictEqual(
    stringToBoolean({
      sourceValue: '  true  ',
      trimWhitespace: false,
      unmatchedBehavior: 'false'
    }),
    false
  );
});

test('honors case sensitive matching', function () {
  assert.strictEqual(
    stringToBoolean({
      sourceValue: 'TRUE',
      caseSensitive: true,
      unmatchedBehavior: 'null'
    }),
    null
  );
});

test('uses custom true and false lists', function () {
  var settings = {
    trueValues: ['Enabled'],
    falseValues: ['Disabled'],
    unmatchedBehavior: 'null'
  };

  assert.strictEqual(
    stringToBoolean(Object.assign({ sourceValue: 'enabled' }, settings)),
    true
  );
  assert.strictEqual(
    stringToBoolean(Object.assign({ sourceValue: 'disabled' }, settings)),
    false
  );
  assert.strictEqual(
    stringToBoolean(Object.assign({ sourceValue: 'true' }, settings)),
    null
  );
});

test('applies the unmatched behavior', function () {
  assert.strictEqual(
    stringToBoolean({ sourceValue: 'maybe', unmatchedBehavior: 'false' }),
    false
  );
  assert.strictEqual(
    stringToBoolean({ sourceValue: 'maybe', unmatchedBehavior: 'true' }),
    true
  );
  assert.strictEqual(
    stringToBoolean({ sourceValue: 'maybe', unmatchedBehavior: 'null' }),
    null
  );
  assert.strictEqual(
    stringToBoolean({ sourceValue: 'maybe', unmatchedBehavior: 'default' }),
    undefined
  );
  assert.strictEqual(stringToBoolean({ sourceValue: 'maybe' }), undefined);
});

test('converts unmatched values by truthiness when asked', function () {
  var settings = { unmatchedBehavior: 'truthy' };

  assert.strictEqual(
    stringToBoolean(Object.assign({ sourceValue: 'maybe' }, settings)),
    true
  );
  assert.strictEqual(
    stringToBoolean(Object.assign({ sourceValue: '2' }, settings)),
    true
  );
  assert.strictEqual(
    stringToBoolean(Object.assign({ sourceValue: '0.0' }, settings)),
    false
  );
  assert.strictEqual(
    stringToBoolean(Object.assign({ sourceValue: '-0' }, settings)),
    false
  );
});

test('applies the empty behavior to empty and whitespace-only values', function () {
  ['', '   ', '\t\n'].forEach(function (value) {
    assert.strictEqual(
      stringToBoolean({ sourceValue: value, emptyBehavior: 'false' }),
      false,
      JSON.stringify(value)
    );
  });

  assert.strictEqual(
    stringToBoolean({ sourceValue: '   ', emptyBehavior: 'null' }),
    null
  );
  assert.strictEqual(stringToBoolean({ sourceValue: '' }), undefined);
});

test('applies the null behavior to null and undefined values', function () {
  assert.strictEqual(
    stringToBoolean({ sourceValue: null, nullBehavior: 'false' }),
    false
  );
  assert.strictEqual(
    stringToBoolean({ sourceValue: undefined, nullBehavior: 'null' }),
    null
  );
  assert.strictEqual(stringToBoolean({ sourceValue: null }), undefined);
});

test('passes through values that are already Boolean', function () {
  assert.strictEqual(stringToBoolean({ sourceValue: true }), true);
  assert.strictEqual(stringToBoolean({ sourceValue: false }), false);
});

test('coerces non-string primitives before matching', function () {
  assert.strictEqual(stringToBoolean({ sourceValue: 1 }), true);
  assert.strictEqual(stringToBoolean({ sourceValue: 0 }), false);
});
