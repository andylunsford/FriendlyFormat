'use strict';

/**
 * Every edge-case setting can resolve to `undefined`, which is exactly what an
 * omitted XDM field looks like — and what a misconfigured source value looks
 * like too. The runtime logging exists to tell those apart, so these checks
 * cover the message text and the level each path logs at.
 *
 * `turbine` is a free variable the Tags runtime injects into library modules. It
 * does not exist here, so the tests install and remove a stub.
 */

var test = require('node:test');
var assert = require('node:assert');

var logger = require('../src/lib/helpers/logger');

/** Collects what the module logs, standing in for turbine.logger. */
var withStubLogger = function (run) {
  var calls = [];
  var record = function (level) {
    return function (message) {
      calls.push({ level: level, message: message });
    };
  };

  global.turbine = {
    logger: {
      debug: record('debug'),
      log: record('log'),
      info: record('info'),
      warn: record('warn'),
      error: record('error')
    }
  };

  try {
    run(calls);
  } finally {
    delete global.turbine;
  }
};

test('a converted value is reported at debug level', function () {
  withStubLogger(function (calls) {
    logger.report({
      type: 'String to Boolean',
      path: logger.PATH.MATCHED,
      sourceValue: 'NO',
      detail: 'the false list',
      result: false
    });

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].level, 'debug');
    assert.match(calls[0].message, /String to Boolean/);
    assert.match(calls[0].message, /"NO"/);
    assert.match(calls[0].message, /false/);
  });
});

test('a value dropped by a fallback setting is reported at warn level', function () {
  withStubLogger(function (calls) {
    logger.report({
      type: 'String to Boolean',
      path: logger.PATH.UNMATCHED,
      sourceValue: 'maybe',
      setting: 'unmatchedBehavior',
      behavior: 'omit',
      result: undefined
    });

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].level, 'warn');
    assert.match(calls[0].message, /"maybe"/);
    assert.match(calls[0].message, /unmatchedBehavior/);
    assert.match(calls[0].message, /omit/);
    // The consequence is the part people are actually missing.
    assert.match(calls[0].message, /left out of the payload/);
  });
});

test('each fallback path names the setting that produced the value', function () {
  withStubLogger(function (calls) {
    logger.report({
      type: 'String to Integer',
      path: logger.PATH.NULLISH,
      sourceValue: undefined,
      setting: 'nullBehavior',
      behavior: 'zero',
      result: 0
    });
    logger.report({
      type: 'String to Integer',
      path: logger.PATH.EMPTY,
      sourceValue: '',
      setting: 'emptyBehavior',
      behavior: 'null',
      result: null
    });
    logger.report({
      type: 'String to Double',
      path: logger.PATH.INVALID,
      sourceValue: 'abc',
      setting: 'invalidBehavior',
      behavior: 'null',
      result: null
    });

    assert.deepStrictEqual(
      calls.map(function (entry) {
        return entry.level;
      }),
      ['warn', 'warn', 'warn']
    );
    assert.match(calls[0].message, /nullBehavior/);
    assert.match(calls[0].message, /no value/);
    assert.match(calls[1].message, /emptyBehavior/);
    assert.match(calls[2].message, /invalidBehavior/);
    assert.match(calls[2].message, /"abc"/);
  });
});

test('nothing is logged, and nothing throws, outside the Tags runtime', function () {
  assert.strictEqual(typeof global.turbine, 'undefined');

  assert.doesNotThrow(function () {
    logger.report({
      type: 'String to Boolean',
      path: logger.PATH.UNMATCHED,
      sourceValue: 'maybe',
      setting: 'unmatchedBehavior',
      behavior: 'omit',
      result: undefined
    });
  });
});

test('a runtime without a logger is tolerated', function () {
  global.turbine = {};

  try {
    assert.doesNotThrow(function () {
      logger.report({
        type: 'String to Boolean',
        path: logger.PATH.MATCHED,
        sourceValue: 'yes',
        detail: 'the true list',
        result: true
      });
    });
  } finally {
    delete global.turbine;
  }
});

test('values are described unambiguously', function () {
  withStubLogger(function (calls) {
    logger.report({
      type: 'String to Boolean',
      path: logger.PATH.PASSTHROUGH,
      sourceValue: true,
      result: true
    });

    // A quoted "true" and a bare true are different inputs and the message has
    // to distinguish them, since that is the whole point of the extension.
    assert.match(calls[0].message, /boolean true/);
    assert.doesNotMatch(calls[0].message, /"true"/);
  });
});
