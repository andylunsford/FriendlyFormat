'use strict';

/**
 * Shared handling for the "what should I return when the input is not a clean
 * value?" settings used by every Friendly Format data element type.
 *
 * Note on `null` vs `default`: Tags replaces a data element result of `null` or
 * `undefined` with the Default Value configured on the data element, when one is
 * configured. `null` therefore reaches the page as `null` only when the data
 * element has no Default Value set.
 */

var isNullish = function (value) {
  return value === null || value === undefined;
};

/**
 * Turns a behavior setting into the value the data element should return.
 *
 * @param {string} behavior One of `true`, `false`, `zero`, `null`, `default`.
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
      // `default`, or an unrecognized/absent setting: let Tags fall back to the
      // data element's configured Default Value.
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
