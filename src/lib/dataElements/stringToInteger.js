'use strict';

var behaviors = require('../helpers/behaviors');
var parseNumber = require('../helpers/parseNumber');

/**
 * Converts a string into a whole number for XDM integer/long/short fields.
 *
 * @param {Object} settings
 * @param {string} settings.sourceValue The value to convert, typically a data
 *   element token such as `%cartQuantity%`.
 * @param {boolean} [settings.trimWhitespace=true]
 * @param {boolean} [settings.stripNonNumeric=false]
 * @param {boolean} [settings.strictParsing=true]
 * @param {string} [settings.decimalHandling=round]
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
    return behaviors.resolveBehavior(settings.nullBehavior);
  }

  if (source.state === 'empty') {
    return behaviors.resolveBehavior(settings.emptyBehavior);
  }

  var parsed = parseNumber.parseNumber(source.value, {
    strictParsing: settings.strictParsing,
    stripNonNumeric: settings.stripNonNumeric
  });

  if (!isFinite(parsed)) {
    return behaviors.resolveBehavior(settings.invalidBehavior);
  }

  var integer = parseNumber.toInteger(parsed, settings.decimalHandling);

  if (isNaN(integer)) {
    return behaviors.resolveBehavior(settings.invalidBehavior);
  }

  // Normalize -0 so downstream JSON serialization emits 0.
  return integer === 0 ? 0 : integer;
};
