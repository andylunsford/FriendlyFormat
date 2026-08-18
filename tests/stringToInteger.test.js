'use strict';

var test = require('node:test');
var assert = require('node:assert');

var stringToInteger = require('../src/lib/dataElements/stringToInteger');

test('parses whole numbers', function () {
  assert.strictEqual(stringToInteger({ sourceValue: '42' }), 42);
  assert.strictEqual(stringToInteger({ sourceValue: '-7' }), -7);
  assert.strictEqual(stringToInteger({ sourceValue: '+7' }), 7);
  assert.strictEqual(stringToInteger({ sourceValue: '  42  ' }), 42);
});

test('rounds decimals by default', function () {
  assert.strictEqual(stringToInteger({ sourceValue: '12.6' }), 13);
  assert.strictEqual(stringToInteger({ sourceValue: '12.4' }), 12);
});

test('supports the other decimal strategies', function () {
  var value = '-12.6';

  assert.strictEqual(
    stringToInteger({ sourceValue: value, decimalHandling: 'truncate' }),
    -12
  );
  assert.strictEqual(
    stringToInteger({ sourceValue: value, decimalHandling: 'floor' }),
    -13
  );
  assert.strictEqual(
    stringToInteger({ sourceValue: value, decimalHandling: 'ceil' }),
    -12
  );
  assert.strictEqual(
    stringToInteger({
      sourceValue: value,
      decimalHandling: 'invalid',
      invalidBehavior: 'null'
    }),
    null
  );
});

test('rejects partially numeric values when parsing strictly', function () {
  assert.strictEqual(
    stringToInteger({ sourceValue: '12abc', invalidBehavior: 'null' }),
    null
  );
});

test('accepts a leading number when parsing leniently', function () {
  assert.strictEqual(
    stringToInteger({ sourceValue: '12abc', strictParsing: false }),
    12
  );
});

test('strips non-numeric characters when asked', function () {
  assert.strictEqual(
    stringToInteger({ sourceValue: '$1,234', stripNonNumeric: true }),
    1234
  );
  assert.strictEqual(
    stringToInteger({ sourceValue: '1 234 units', stripNonNumeric: true }),
    1234
  );
});

test('drops exponent notation while stripping', function () {
  // Stripping cannot tell an exponent `e` from a letter in a unit, so the `e`
  // is removed along with everything else non-numeric: 1.2e3 becomes 1.23.
  assert.strictEqual(
    stringToInteger({ sourceValue: '1.2e3', stripNonNumeric: true }),
    1
  );
  assert.strictEqual(stringToInteger({ sourceValue: '1.2e3' }), 1200);
});

test('applies the invalid behavior', function () {
  assert.strictEqual(
    stringToInteger({ sourceValue: 'abc', invalidBehavior: 'zero' }),
    0
  );
  assert.strictEqual(
    stringToInteger({ sourceValue: 'abc', invalidBehavior: 'null' }),
    null
  );
  assert.strictEqual(stringToInteger({ sourceValue: 'abc' }), undefined);
});

test('treats Infinity as invalid', function () {
  assert.strictEqual(
    stringToInteger({
      sourceValue: 'Infinity',
      strictParsing: false,
      invalidBehavior: 'null'
    }),
    null
  );
});

test('applies the empty behavior', function () {
  assert.strictEqual(
    stringToInteger({ sourceValue: '   ', emptyBehavior: 'zero' }),
    0
  );
  assert.strictEqual(
    stringToInteger({ sourceValue: '', emptyBehavior: 'null' }),
    null
  );
  assert.strictEqual(stringToInteger({ sourceValue: '' }), undefined);
});

test('applies the null behavior', function () {
  assert.strictEqual(
    stringToInteger({ sourceValue: null, nullBehavior: 'zero' }),
    0
  );
  assert.strictEqual(
    stringToInteger({ sourceValue: undefined, nullBehavior: 'null' }),
    null
  );
});

test('normalizes negative zero', function () {
  assert.strictEqual(
    Object.is(stringToInteger({ sourceValue: '-0.2' }), 0),
    true
  );
});
