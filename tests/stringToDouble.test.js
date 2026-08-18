'use strict';

var test = require('node:test');
var assert = require('node:assert');

var stringToDouble = require('../src/lib/dataElements/stringToDouble');

test('parses decimal numbers', function () {
  assert.strictEqual(stringToDouble({ sourceValue: '19.99' }), 19.99);
  assert.strictEqual(stringToDouble({ sourceValue: '-0.5' }), -0.5);
  assert.strictEqual(stringToDouble({ sourceValue: '.5' }), 0.5);
  assert.strictEqual(stringToDouble({ sourceValue: '  19.99 ' }), 19.99);
  assert.strictEqual(stringToDouble({ sourceValue: '1.2e3' }), 1200);
});

test('reads comma decimal notation', function () {
  assert.strictEqual(
    stringToDouble({ sourceValue: '1.234,56', decimalSeparator: 'comma' }),
    1234.56
  );
  assert.strictEqual(
    stringToDouble({ sourceValue: '19,99', decimalSeparator: 'comma' }),
    19.99
  );
});

test('strips non-numeric characters when asked', function () {
  assert.strictEqual(
    stringToDouble({ sourceValue: '$1,234.56', stripNonNumeric: true }),
    1234.56
  );
  assert.strictEqual(
    stringToDouble({
      sourceValue: '€1.234,56',
      decimalSeparator: 'comma',
      stripNonNumeric: true
    }),
    1234.56
  );
});

test('rejects partially numeric values when parsing strictly', function () {
  assert.strictEqual(
    stringToDouble({ sourceValue: '12.5kg', invalidBehavior: 'null' }),
    null
  );
});

test('accepts a leading number when parsing leniently', function () {
  assert.strictEqual(
    stringToDouble({ sourceValue: '12.5kg', strictParsing: false }),
    12.5
  );
});

test('rounds to the configured precision', function () {
  assert.strictEqual(
    stringToDouble({ sourceValue: '19.9876', precision: 2 }),
    19.99
  );
  assert.strictEqual(
    stringToDouble({ sourceValue: '19.9876', precision: 0 }),
    20
  );
  assert.strictEqual(stringToDouble({ sourceValue: '19.9876' }), 19.9876);
});

test('applies the invalid behavior', function () {
  assert.strictEqual(
    stringToDouble({ sourceValue: 'abc', invalidBehavior: 'zero' }),
    0
  );
  assert.strictEqual(
    stringToDouble({ sourceValue: 'abc', invalidBehavior: 'null' }),
    null
  );
  assert.strictEqual(stringToDouble({ sourceValue: 'abc' }), undefined);
});

test('applies the empty behavior', function () {
  assert.strictEqual(
    stringToDouble({ sourceValue: '   ', emptyBehavior: 'zero' }),
    0
  );
  assert.strictEqual(
    stringToDouble({ sourceValue: '', emptyBehavior: 'null' }),
    null
  );
});

test('applies the null behavior', function () {
  assert.strictEqual(
    stringToDouble({ sourceValue: null, nullBehavior: 'zero' }),
    0
  );
  assert.strictEqual(
    stringToDouble({ sourceValue: undefined, nullBehavior: 'null' }),
    null
  );
});

test('normalizes negative zero', function () {
  assert.strictEqual(Object.is(stringToDouble({ sourceValue: '-0' }), 0), true);
});
