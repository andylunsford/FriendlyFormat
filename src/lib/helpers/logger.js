'use strict';

/**
 * Explains, in the Tags debug console, which path a conversion took and why it
 * returned what it did.
 *
 * `omit` returns `undefined`, which is the point — the Web SDK then leaves the
 * field out of the payload entirely. The cost is that a correctly omitted field
 * and a misconfigured source value look identical from the outside: both are
 * just a data element that resolves to nothing. Rather than guess, every path
 * through every type reports itself here.
 *
 * Enable the output with `_satellite.setDebug(true)` in the browser console, or
 * the debug toggle in the Experience Platform Debugger, then re-resolve the data
 * element. Adobe documents the levels at
 * <https://experienceleague.adobe.com/en/docs/experience-platform/collection/tags/logger>.
 *
 * Library modules use `turbine.logger` rather than the `_satellite.logger` that
 * page describes: it is the same logger, reached the way extension code is meant
 * to reach it, and messages arrive prefixed with the extension name. `turbine` is
 * a free variable the runtime injects into each module, so it is absent in unit
 * tests and anywhere else this file is loaded as plain CommonJS — hence the
 * `typeof` guard rather than a direct reference.
 */

/** The distinct routes a conversion can take, for `report`'s `path`. */
var PATH = {
  NULLISH: 'nullish',
  EMPTY: 'empty',
  UNMATCHED: 'unmatched',
  INVALID: 'invalid',
  MATCHED: 'matched',
  TRUTHY: 'truthy',
  PARSED: 'parsed',
  PASSTHROUGH: 'passthrough'
};

/**
 * Paths where the returned value came from a fallback setting rather than from
 * the data. Worth a warning: this is where a misconfiguration shows up.
 */
var FALLBACK_PATHS = [PATH.NULLISH, PATH.EMPTY, PATH.UNMATCHED, PATH.INVALID];

/**
 * Renders a value so the message cannot be misread. The distinction between the
 * string "true" and the boolean true is the entire subject of this extension, so
 * strings keep their quotes and everything else does not get any.
 */
var describe = function (value) {
  if (value === undefined) {
    return 'undefined';
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return '"' + value + '"';
  }

  if (typeof value === 'boolean') {
    return 'boolean ' + String(value);
  }

  return String(value);
};

/** The reason clause: what the module found in the source value. */
var reason = function (outcome) {
  switch (outcome.path) {
    case PATH.NULLISH:
      return 'no value to convert — the source resolved to ' +
        describe(outcome.sourceValue);
    case PATH.EMPTY:
      return 'the source resolved to an empty or whitespace-only value';
    case PATH.UNMATCHED:
      return describe(outcome.sourceValue) +
        ' is in neither the true nor the false list';
    case PATH.INVALID:
      return describe(outcome.sourceValue) + ' is not a number';
    case PATH.MATCHED:
      return describe(outcome.sourceValue) + ' matched ' + outcome.detail;
    case PATH.TRUTHY:
      return describe(outcome.sourceValue) +
        ' is in neither list, so it was judged on truthiness';
    case PATH.PARSED:
      return 'parsed ' + describe(outcome.sourceValue);
    case PATH.PASSTHROUGH:
      return 'the source was already ' + describe(outcome.sourceValue);
    default:
      return 'converted ' + describe(outcome.sourceValue);
  }
};

/** The result clause: what came back, and which setting decided it. */
var resolution = function (outcome) {
  var value = describe(outcome.result);

  if (outcome.setting) {
    return outcome.setting +
      ' "' +
      outcome.behavior +
      '" returned ' +
      value;
  }

  return 'returned ' + value;
};

/**
 * Builds the message for an outcome. Exported for the tests, which assert on the
 * wording rather than on console side effects.
 *
 * @param {Object} outcome See `report`.
 * @returns {string}
 */
var formatOutcome = function (outcome) {
  // A semicolon rather than a full stop: the resolution clause reads as a
  // continuation of the reason, and starts with a setting name or a bare verb.
  var message =
    outcome.type + ': ' + reason(outcome) + '; ' + resolution(outcome) + '.';

  // The consequence nobody expects: an undefined data element is not an error,
  // and the field simply will not appear in the payload.
  if (outcome.result === undefined) {
    message += ' The field is left out of the payload.';
  }

  return message;
};

/**
 * Reports one conversion to the Tags debug console. A no-op outside the runtime.
 *
 * @param {Object} outcome
 * @param {string} outcome.type Display name of the data element type.
 * @param {string} outcome.path One of `PATH`.
 * @param {*} outcome.sourceValue The value the module received from settings.
 * @param {string} [outcome.setting] Name of the setting that chose the result,
 *   when a fallback produced it.
 * @param {string} [outcome.behavior] That setting's value.
 * @param {string} [outcome.detail] Extra context for the reason clause.
 * @param {*} outcome.result What the module is returning.
 */
var report = function (outcome) {
  /* eslint-disable no-undef */
  var runtime = typeof turbine === 'undefined' ? null : turbine;
  /* eslint-enable no-undef */

  if (!runtime || !runtime.logger) {
    return;
  }

  var level =
    FALLBACK_PATHS.indexOf(outcome.path) === -1 ? 'debug' : 'warn';

  if (typeof runtime.logger[level] !== 'function') {
    return;
  }

  runtime.logger[level](formatOutcome(outcome));
};

module.exports = {
  PATH: PATH,
  describe: describe,
  formatOutcome: formatOutcome,
  report: report
};
