'use strict';

var behaviors = require('../helpers/behaviors');
var constants = require('../helpers/constants');

var DEFAULT_TRUE_VALUES = constants.DEFAULT_TRUE_VALUES;
var DEFAULT_FALSE_VALUES = constants.DEFAULT_FALSE_VALUES;

var normalizeList = function (list, fallback, caseSensitive) {
  var source = Array.isArray(list) && list.length ? list : fallback;

  return source.map(function (item) {
    var value = String(item);
    return caseSensitive ? value : value.toLowerCase();
  });
};

var includes = function (list, value) {
  return list.indexOf(value) !== -1;
};

/**
 * JavaScript-style truthiness for a string that matched neither list. Numeric
 * strings are judged by their numeric value, so `0`, `0.0`, and `-0` are false
 * while `2` is true. Everything else non-empty is true.
 */
var isTruthy = function (stringValue) {
  var asNumber = Number(stringValue);

  if (!isNaN(asNumber)) {
    return Boolean(asNumber);
  }

  return Boolean(stringValue);
};

/**
 * Converts a string into a real Boolean for XDM ingestion.
 *
 * @param {Object} settings
 * @param {string} settings.sourceValue The value to convert, typically a data
 *   element token such as `%loggedIn%`.
 * @param {boolean} [settings.trimWhitespace=true]
 * @param {boolean} [settings.caseSensitive=false]
 * @param {Array<string>} [settings.trueValues]
 * @param {Array<string>} [settings.falseValues]
 * @param {string} [settings.unmatchedBehavior=default]
 * @param {string} [settings.emptyBehavior=default]
 * @param {string} [settings.nullBehavior=default]
 * @returns {boolean|null|undefined}
 */
module.exports = function (settings) {
  var sourceValue = settings.sourceValue;

  if (typeof sourceValue === 'boolean') {
    return sourceValue;
  }

  var source = behaviors.inspectSource(sourceValue, settings.trimWhitespace);

  if (source.state === 'nullish') {
    return behaviors.resolveBehavior(settings.nullBehavior);
  }

  if (source.state === 'empty') {
    return behaviors.resolveBehavior(settings.emptyBehavior);
  }

  var caseSensitive = Boolean(settings.caseSensitive);
  var comparable = caseSensitive ? source.value : source.value.toLowerCase();

  if (
    includes(
      normalizeList(settings.trueValues, DEFAULT_TRUE_VALUES, caseSensitive),
      comparable
    )
  ) {
    return true;
  }

  if (
    includes(
      normalizeList(settings.falseValues, DEFAULT_FALSE_VALUES, caseSensitive),
      comparable
    )
  ) {
    return false;
  }

  if (settings.unmatchedBehavior === constants.BEHAVIOR.TRUTHY) {
    return isTruthy(source.value);
  }

  return behaviors.resolveBehavior(settings.unmatchedBehavior);
};
