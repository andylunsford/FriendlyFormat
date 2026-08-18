'use strict';

/**
 * Shared numeric parsing for the integer and double data element types.
 */

var constants = require('./constants');

var DECIMAL_HANDLING = constants.DECIMAL_HANDLING;
var DECIMAL_SEPARATOR = constants.DECIMAL_SEPARATOR;

// A complete, well-formed decimal number (optionally in exponent notation).
var STRICT_NUMBER = /^[+-]?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?$/;

/**
 * Rewrites a numeric string so `Number()`/`parseFloat()` can read it.
 *
 * @param {string} stringValue
 * @param {Object} options
 * @param {string} [options.decimalSeparator] `period` (default) or `comma`.
 *   With `comma`, `1.234,56` is read as one thousand two hundred thirty four
 *   point five six.
 * @param {boolean} [options.stripNonNumeric] Removes currency symbols, spaces,
 *   grouping separators, and any other character that is not a digit, a sign,
 *   or the decimal point. Exponent notation is not preserved when stripping,
 *   because an `e` cannot be told apart from a letter in a unit such as
 *   `items`.
 * @returns {string}
 */
var normalize = function (stringValue, options) {
  var value = stringValue;

  if (options.decimalSeparator === DECIMAL_SEPARATOR.COMMA) {
    // Periods are grouping separators in this notation, commas are the point.
    value = value.replace(/\./g, '').replace(/,/g, '.');
  }

  if (options.stripNonNumeric) {
    value = value.replace(/[^0-9+\-.]/g, '');
  }

  return value;
};

/**
 * Parses a string into a JavaScript number.
 *
 * @param {string} stringValue A non-empty string.
 * @param {Object} options
 * @param {boolean} [options.strictParsing] When true (the default), the entire
 *   string must be a valid number, so `12abc` is rejected. When false, a
 *   leading number is accepted, so `12abc` yields `12`.
 * @param {boolean} [options.stripNonNumeric]
 * @param {string} [options.decimalSeparator]
 * @returns {number} The parsed number, or `NaN` when the string cannot be read.
 */
var parseNumber = function (stringValue, options) {
  var settings = options || {};
  var value = normalize(stringValue, settings);

  if (value === '') {
    return NaN;
  }

  if (settings.strictParsing === false) {
    return parseFloat(value);
  }

  return STRICT_NUMBER.test(value) ? Number(value) : NaN;
};

/**
 * Applies the configured rounding strategy to a number that has a fractional
 * part.
 *
 * @param {number} value
 * @param {string} decimalHandling `round` (default), `truncate`, `floor`,
 *   `ceil`, or `invalid` (treat fractional input as unparseable).
 * @returns {number} An integer, or `NaN` when the value is rejected.
 */
var toInteger = function (value, decimalHandling) {
  if (value % 1 === 0) {
    return value;
  }

  switch (decimalHandling) {
    case DECIMAL_HANDLING.TRUNCATE:
      // Math.trunc is ES2015; this keeps the runtime library ES5-safe.
      return value < 0 ? Math.ceil(value) : Math.floor(value);
    case DECIMAL_HANDLING.FLOOR:
      return Math.floor(value);
    case DECIMAL_HANDLING.CEIL:
      return Math.ceil(value);
    case DECIMAL_HANDLING.INVALID:
      return NaN;
    default:
      return Math.round(value);
  }
};

module.exports = {
  parseNumber: parseNumber,
  toInteger: toInteger
};
