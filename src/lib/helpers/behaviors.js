'use strict';

/**
 * Shared handling for the "what should I return when the input is not a clean
 * value?" settings used by every Friendly Format data element type.
 *
 * Note on `null` vs `omit`: Tags replaces a result of `null` or `undefined` with
 * the data element's Default Value whenever one is present, and that value is
 * always a string — a blank Default Value yields `""`. Both behaviors therefore
 * only survive to the page when the Default Value field is left empty, which is
 * what the views tell authors to do.
 */

var isNullish = function (value) {
  return value === null || value === undefined;
};

/**
 * Turns a behavior setting into the value the data element should return.
 *
 * @param {string} behavior One of `true`, `false`, `zero`, `null`, `omit`.
 * @returns {boolean|number|null|undefined}
 */
var resolveBehavior = function (behavior) {
  switch (behavior) {
    case 'true':
      return true;
    case 'false':
      return false;
    case 'zero':
      return 0;
    case 'null':
      return null;
    default:
      // `omit`, an absent setting, or anything unrecognized: return nothing, so
      // the Web SDK leaves the field out of the payload.
      return undefined;
  }
};

/**
 * Normalizes the raw source value into a string ready for parsing.
 *
 * @param {*} sourceValue The (already token-substituted) value from settings.
 * @param {boolean} trimWhitespace Whether surrounding whitespace is removed.
 * @returns {{ state: string, value: string }} `state` is one of `nullish`,
 *   `empty`, or `value`.
 */
var inspectSource = function (sourceValue, trimWhitespace) {
  if (isNullish(sourceValue)) {
    return { state: 'nullish', value: '' };
  }

  var stringValue = String(sourceValue);

  // A whitespace-only string carries no data regardless of the trim setting.
  if (stringValue.trim() === '') {
    return { state: 'empty', value: '' };
  }

  return {
    state: 'value',
    value: trimWhitespace === false ? stringValue : stringValue.trim()
  };
};

module.exports = {
  isNullish: isNullish,
  resolveBehavior: resolveBehavior,
  inspectSource: inspectSource
};
