'use strict';

var behaviors = require('../helpers/behaviors');
var constants = require('../helpers/constants');
var logger = require('../helpers/logger');

var DEFAULT_TRUE_VALUES = constants.DEFAULT_TRUE_VALUES;
var DEFAULT_FALSE_VALUES = constants.DEFAULT_FALSE_VALUES;

var TYPE = 'String to Boolean';

/** Logs the outcome and returns it, so every exit point stays a one-liner. */
var reporting = function (outcome) {
  logger.report(outcome);
  return outcome.result;
};

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
    return reporting({
      type: TYPE,
      path: logger.PATH.PASSTHROUGH,
      sourceValue: sourceValue,
      result: sourceValue
    });
  }

  var source = behaviors.inspectSource(sourceValue, settings.trimWhitespace);

  if (source.state === 'nullish') {
    return reporting({
      type: TYPE,
      path: logger.PATH.NULLISH,
      sourceValue: sourceValue,
      setting: 'nullBehavior',
      behavior: settings.nullBehavior,
      result: behaviors.resolveBehavior(settings.nullBehavior)
    });
  }

  if (source.state === 'empty') {
    return reporting({
      type: TYPE,
      path: logger.PATH.EMPTY,
      sourceValue: sourceValue,
      setting: 'emptyBehavior',
      behavior: settings.emptyBehavior,
      result: behaviors.resolveBehavior(settings.emptyBehavior)
    });
  }

  var caseSensitive = Boolean(settings.caseSensitive);
  var comparable = caseSensitive ? source.value : source.value.toLowerCase();

  if (
    includes(
      normalizeList(settings.trueValues, DEFAULT_TRUE_VALUES, caseSensitive),
      comparable
    )
  ) {
    return reporting({
      type: TYPE,
      path: logger.PATH.MATCHED,
      sourceValue: source.value,
      detail: 'the true list',
      result: true
    });
  }

  if (
    includes(
      normalizeList(settings.falseValues, DEFAULT_FALSE_VALUES, caseSensitive),
      comparable
    )
  ) {
    return reporting({
      type: TYPE,
      path: logger.PATH.MATCHED,
      sourceValue: source.value,
      detail: 'the false list',
      result: false
    });
  }

  if (settings.unmatchedBehavior === constants.BEHAVIOR.TRUTHY) {
    return reporting({
      type: TYPE,
      path: logger.PATH.TRUTHY,
      sourceValue: source.value,
      setting: 'unmatchedBehavior',
      behavior: constants.BEHAVIOR.TRUTHY,
      result: isTruthy(source.value)
    });
  }

  return reporting({
    type: TYPE,
    path: logger.PATH.UNMATCHED,
    sourceValue: source.value,
    setting: 'unmatchedBehavior',
    behavior: settings.unmatchedBehavior,
    result: behaviors.resolveBehavior(settings.unmatchedBehavior)
  });
};
