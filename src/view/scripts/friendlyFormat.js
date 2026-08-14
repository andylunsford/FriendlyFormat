/**
 * Small helpers shared by the Friendly Format views. Kept dependency free and
 * ES5 so the views run in whatever browser the Tags UI is opened in.
 */
window.friendlyFormat = (function () {
  'use strict';

  var byId = function (id) {
    return document.getElementById(id);
  };

  /**
   * Wires an "Add data element" button to the Tags data element selector. The
   * selected data element is inserted as a `%token%` at the cursor.
   */
  var wireDataElementButton = function (inputId, buttonId) {
    var input = byId(inputId);
    var button = byId(buttonId);

    if (!input || !button) {
      return;
    }

    button.addEventListener('click', function () {
      window.extensionBridge
        .openDataElementSelector({ tokenize: true })
        .then(function (token) {
          if (!token) {
            return;
          }

          var start =
            typeof input.selectionStart === 'number'
              ? input.selectionStart
              : input.value.length;
          var end =
            typeof input.selectionEnd === 'number'
              ? input.selectionEnd
              : input.value.length;

          input.value =
            input.value.slice(0, start) + token + input.value.slice(end);
          input.focus();
        });
    });
  };

  /** Splits a comma separated list into trimmed, non-empty entries. */
  var parseList = function (value) {
    return String(value || '')
      .split(',')
      .map(function (entry) {
        return entry.trim();
      })
      .filter(function (entry) {
        return entry.length > 0;
      });
  };

  var formatList = function (list) {
    return Array.isArray(list) ? list.join(', ') : '';
  };

  /** Sets a field's value, clearing it when the setting is absent. */
  var setValue = function (id, value) {
    var element = byId(id);

    if (element) {
      element.value = value === undefined || value === null ? '' : value;
    }
  };

  var getValue = function (id) {
    var element = byId(id);
    return element ? element.value : '';
  };

  /** Reads a checkbox, falling back to the type's documented default. */
  var setChecked = function (id, value, defaultValue) {
    var element = byId(id);

    if (element) {
      element.checked = value === undefined ? Boolean(defaultValue) : Boolean(value);
    }
  };

  var isChecked = function (id) {
    var element = byId(id);
    return Boolean(element && element.checked);
  };

  var showError = function (id, visible) {
    var element = byId(id);

    if (element) {
      element.classList.toggle('ff-visible', Boolean(visible));
    }
  };

  var markInvalid = function (id, invalid) {
    var element = byId(id);

    if (element) {
      element.classList.toggle('ff-invalid', Boolean(invalid));
    }
  };

  /**
   * Validates the source value field, which every type requires.
   *
   * @returns {boolean}
   */
  var validateSourceValue = function () {
    var valid = getValue('sourceValue').trim().length > 0;

    markInvalid('sourceValue', !valid);
    showError('sourceValueError', !valid);

    return valid;
  };

  return {
    byId: byId,
    wireDataElementButton: wireDataElementButton,
    parseList: parseList,
    formatList: formatList,
    setValue: setValue,
    getValue: getValue,
    setChecked: setChecked,
    isChecked: isChecked,
    showError: showError,
    markInvalid: markInvalid,
    validateSourceValue: validateSourceValue
  };
})();
