'use strict';

/**
 * The enum restrictions in extension.json exist in three places: the manifest
 * itself, the runtime constants, and the options each view offers. Nothing
 * enforces that they agree at runtime, so they are compared here.
 */

var test = require('node:test');
var assert = require('node:assert');
var fs = require('node:fs');
var path = require('node:path');

var constants = require('../src/lib/helpers/constants');

var ROOT = path.join(__dirname, '..');
var manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'extension.json'), 'utf8')
);

var readView = function (name) {
  return fs.readFileSync(
    path.join(ROOT, 'src', 'view', 'dataElements', name + '.html'),
    'utf8'
  );
};

var dataElement = function (name) {
  var found = manifest.dataElements.filter(function (entry) {
    return entry.name === name;
  })[0];

  assert.ok(found, 'manifest is missing the ' + name + ' data element type');
  return found;
};

var enumFor = function (typeName, property) {
  var schema = dataElement(typeName).schema.properties[property];

  assert.ok(schema, typeName + ' has no ' + property + ' setting');
  assert.ok(schema.enum, typeName + '.' + property + ' has no enum');

  return schema.enum.slice().sort();
};

/** Option values offered by a `<coral-select>` in a view, in document order. */
var selectOptions = function (viewName, selectId) {
  var html = readView(viewName);
  var select = new RegExp(
    '<coral-select id="' + selectId + '"[\\s\\S]*?</coral-select>'
  ).exec(html);

  assert.ok(select, viewName + ' has no select with id ' + selectId);

  var values = [];
  var option = /<coral-select-item value="([^"]+)"/g;
  var match = option.exec(select[0]);

  while (match) {
    values.push(match[1]);
    match = option.exec(select[0]);
  }

  return values;
};

var sorted = function (values) {
  return values.slice().sort();
};

var B = constants.BEHAVIOR;

test('manifest enums match the runtime constants', function () {
  assert.deepStrictEqual(
    enumFor('string-to-boolean', 'unmatchedBehavior'),
    sorted([B.TRUTHY, B.TRUE, B.FALSE, B.NULL, B.OMIT])
  );

  ['emptyBehavior', 'nullBehavior'].forEach(function (property) {
    assert.deepStrictEqual(
      enumFor('string-to-boolean', property),
      sorted([B.TRUE, B.FALSE, B.NULL, B.OMIT]),
      property
    );
  });

  ['string-to-integer', 'string-to-double'].forEach(function (typeName) {
    ['invalidBehavior', 'emptyBehavior', 'nullBehavior'].forEach(function (
      property
    ) {
      assert.deepStrictEqual(
        enumFor(typeName, property),
        sorted([B.ZERO, B.NULL, B.OMIT]),
        typeName + '.' + property
      );
    });
  });

  assert.deepStrictEqual(
    enumFor('string-to-integer', 'decimalHandling'),
    sorted(
      Object.keys(constants.DECIMAL_HANDLING).map(function (key) {
        return constants.DECIMAL_HANDLING[key];
      })
    )
  );

  assert.deepStrictEqual(
    enumFor('string-to-double', 'decimalSeparator'),
    sorted(
      Object.keys(constants.DECIMAL_SEPARATOR).map(function (key) {
        return constants.DECIMAL_SEPARATOR[key];
      })
    )
  );
});

test('view options match the manifest enums', function () {
  var views = {
    stringToBoolean: {
      typeName: 'string-to-boolean',
      selects: ['unmatchedBehavior', 'emptyBehavior', 'nullBehavior']
    },
    stringToInteger: {
      typeName: 'string-to-integer',
      selects: [
        'decimalHandling',
        'invalidBehavior',
        'emptyBehavior',
        'nullBehavior'
      ]
    },
    stringToDouble: {
      typeName: 'string-to-double',
      selects: [
        'decimalSeparator',
        'invalidBehavior',
        'emptyBehavior',
        'nullBehavior'
      ]
    }
  };

  Object.keys(views).forEach(function (viewName) {
    views[viewName].selects.forEach(function (selectId) {
      assert.deepStrictEqual(
        sorted(selectOptions(viewName, selectId)),
        enumFor(views[viewName].typeName, selectId),
        viewName + ' select ' + selectId
      );
    });
  });
});

test('the Boolean view seeds the documented default value lists', function () {
  var html = readView('stringToBoolean');

  var listFor = function (name) {
    var match = new RegExp('var ' + name + ' = \\[([^\\]]*)\\]').exec(html);

    assert.ok(match, 'stringToBoolean view has no ' + name);

    return match[1].split(',').map(function (entry) {
      return entry.trim().replace(/^'|'$/g, '');
    });
  };

  assert.deepStrictEqual(
    listFor('DEFAULT_TRUE_VALUES'),
    constants.DEFAULT_TRUE_VALUES
  );
  assert.deepStrictEqual(
    listFor('DEFAULT_FALSE_VALUES'),
    constants.DEFAULT_FALSE_VALUES
  );
});

test('every data element type in the manifest has a view and a library module', function () {
  manifest.dataElements.forEach(function (entry) {
    assert.ok(
      fs.existsSync(path.join(ROOT, entry.libPath)),
      entry.name + ' libPath is missing'
    );
    assert.ok(
      fs.existsSync(
        path.join(ROOT, manifest.viewBasePath.replace(/\/$/, ''), entry.viewPath)
      ),
      entry.name + ' viewPath is missing'
    );
  });
});
