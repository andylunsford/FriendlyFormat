'use strict';

/**
 * Every value that `extension.json` restricts with a JSON Schema `enum`, named
 * once for the runtime modules.
 *
 * The manifest and this file are two sources of truth for the same set of
 * values, which is the trade Adobe's extension guidance recommends: the
 * manifest enforces the restriction on saved settings, and the constants keep
 * the runtime from drifting away from it. `tests/manifest.test.js` compares the
 * two — along with the options the views offer — so the copies cannot diverge
 * silently.
 */

/** Results an edge-case setting can ask for. */
var BEHAVIOR = {
  TRUE: 'true',
  FALSE: 'false',
  ZERO: 'zero',
  NULL: 'null',
  OMIT: 'omit',
  TRUTHY: 'truthy'
};

/** What String to Integer does with a fractional value. */
var DECIMAL_HANDLING = {
  ROUND: 'round',
  TRUNCATE: 'truncate',
  FLOOR: 'floor',
  CEIL: 'ceil',
  INVALID: 'invalid'
};

/** Which character String to Double reads as the decimal point. */
var DECIMAL_SEPARATOR = {
  PERIOD: 'period',
  COMMA: 'comma'
};

var DEFAULT_TRUE_VALUES = ['true', 'yes', 'y', '1', 'on', 't'];
var DEFAULT_FALSE_VALUES = ['false', 'no', 'n', '0', 'off', 'f'];

module.exports = {
  BEHAVIOR: BEHAVIOR,
  DECIMAL_HANDLING: DECIMAL_HANDLING,
  DECIMAL_SEPARATOR: DECIMAL_SEPARATOR,
  DEFAULT_TRUE_VALUES: DEFAULT_TRUE_VALUES,
  DEFAULT_FALSE_VALUES: DEFAULT_FALSE_VALUES
};
