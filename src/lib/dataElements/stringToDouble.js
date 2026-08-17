'use strict';

var behaviors = require('../helpers/behaviors');
var logger = require('../helpers/logger');
var parseNumber = require('../helpers/parseNumber');

var TYPE = 'String to Double';

/** Logs the outcome and returns it, so every exit point stays a one-liner. */
var reporting = function (outcome) {
  logger.report(outcome);
  return outcome.result;
};

/**
 * Converts a string into a floating point number for XDM double/number fields.
 *
 * @param {Object} settings
 * @param {string} settings.sourceValue The value to convert, typically a data
 *   element token such as `%orderTotal%`.
 * @param {boolean} [settings.trimWhitespace=true]
 * @param {boolean} [settings.stripNonNumeric=false]
 * @param {boolean} [settings.strictParsing=true]
 * @param {string} [settings.decimalSeparator=period]
 * @param {number} [settings.precision] Decimal places to round to. Omit to keep
 *   the parsed value as-is.
 * @param {string} [settings.invalidBehavior=default]
 * @param {string} [settings.emptyBehavior=default]
 * @param {string} [settings.nullBehavior=default]
 * @returns {number|null|undefined}
 */
module.exports = function (settings) {
  var source = behaviors.inspectSource(
    settings.sourceValue,
    settings.trimWhitespace
  );

  if (source.state === 'nullish') {
    return reporting({
      type: TYPE,
      path: logger.PATH.NULLISH,
      sourceValue: settings.sourceValue,
      setting: 'nullBehavior',
      behavior: settings.nullBehavior,
      result: behaviors.resolveBehavior(settings.nullBehavior)
    });
  }

  if (source.state === 'empty') {
    return reporting({
      type: TYPE,
      path: logger.PATH.EMPTY,
      sourceValue: settings.sourceValue,
      setting: 'emptyBehavior',
      behavior: settings.emptyBehavior,
      result: behaviors.resolveBehavior(settings.emptyBehavior)
    });
  }

  var parsed = parseNumber.parseNumber(source.value, {
    strictParsing: settings.strictParsing,
    stripNonNumeric: settings.stripNonNumeric,
    decimalSeparator: settings.decimalSeparator
  });

  if (!isFinite(parsed)) {
    return reporting({
      type: TYPE,
      path: logger.PATH.INVALID,
      sourceValue: source.value,
      setting: 'invalidBehavior',
      behavior: settings.invalidBehavior,
      result: behaviors.resolveBehavior(settings.invalidBehavior)
    });
  }

  var precision = settings.precision;

  if (typeof precision === 'number' && precision >= 0) {
    parsed = Number(parsed.toFixed(precision));
  }

  return reporting({
    type: TYPE,
    path: logger.PATH.PARSED,
    sourceValue: source.value,
    // Normalize -0 so downstream JSON serialization emits 0.
    result: parsed === 0 ? 0 : parsed
  });
};
