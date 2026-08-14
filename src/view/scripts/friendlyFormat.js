/**
 * Helpers shared by the Friendly Format views.
 *
 * The views are built on Coral Spectrum, Adobe's implementation of the Spectrum
 * design system, which ships as custom elements: `<input is="coral-textfield">`,
 * `<coral-checkbox>`, `<coral-select>`, `<coral-taglist>`, and so on. Coral is
 * vendored into `src/view/vendor/coral` so the package carries its own copy
 * rather than depending on a CDN.
 */
window.friendlyFormat = (function () {
  'use strict';

  var byId = function (id) {
    return document.getElementById(id);
  };

  /* ------------------------------------------------------------------ *
   * Default Value warning
   * ------------------------------------------------------------------ */

  /**
   * Renders the Default Value warning shared by every Friendly Format type.
   *
   * Tags post-processes a data element's result before anything downstream sees
   * it: a `null` or `undefined` result is swapped for the Default Value, and the
   * Force lowercase and Clean text options coerce the result back into a string.
   * Either one quietly defeats the edge-case settings, so the guidance lives
   * right next to them.
   *
   * @param {string} containerId Element that receives the warning.
   */
  var renderDefaultValueNote = function (containerId) {
    var container = byId(containerId);

    if (!container) {
      return;
    }

    container.innerHTML = [
      '<coral-alert variant="warning" size="L" class="ff-alert">',
      '<coral-alert-header>Leave the Default Value field empty</coral-alert-header>',
      '<coral-alert-content>',
      '<p>',
      'Tags replaces this data element&rsquo;s result with its <b>Default ',
      'Value</b> whenever the result is <code>null</code> or ',
      '<code>undefined</code>. Setting a Default Value therefore overrides the ',
      'choices below: <i>Return null</i> stops returning null, and ',
      '<i>Use the data element&rsquo;s default value</i> stops leaving the ',
      'field unset.',
      '</p>',
      '<ul>',
      '<li>',
      '<b>To send a real <code>null</code></b>, which clears the field in Adobe ',
      'Experience Platform: choose <i>Return null</i> and leave Default Value ',
      'empty.',
      '</li>',
      '<li>',
      '<b>To omit the field entirely</b>, leaving whatever is already in the ',
      'profile untouched: choose <i>Use the data element&rsquo;s default ',
      'value</i> and leave Default Value empty. The result is ',
      '<code>undefined</code>, and the Web SDK drops undefined keys from the ',
      'payload.',
      '</li>',
      '<li>',
      '<b>A Default Value is only safe</b> when it is a genuine fallback of the ',
      'right type. Anything you type in that field arrives as a <i>string</i>, ',
      'so <code>false</code> becomes <code>"false"</code> and <code>0</code> ',
      'becomes <code>"0"</code>, which fails validation against a Boolean or ',
      'numeric XDM field. Prefer the edge-case settings below.',
      '</li>',
      '</ul>',
      '<p>',
      'For the same reason, leave <b>Force lowercase</b> and <b>Clean text</b> ',
      'switched off. Both are string operations and both convert the typed ',
      'result back into a string.',
      '</p>',
      '</coral-alert-content>',
      '</coral-alert>'
    ].join('');
  };

  /* ------------------------------------------------------------------ *
   * Data element picker
   * ------------------------------------------------------------------ */

  /**
   * Wires the standard data element picker button to a text field. The selected
   * data element is inserted as a `%token%` at the cursor.
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

  /* ------------------------------------------------------------------ *
   * Tag list field
   * ------------------------------------------------------------------ */

  /**
   * Turns a text field and an adjacent `<coral-taglist>` into a tag entry
   * field: type a value and press Tab, Enter, or comma to add it; each tag
   * carries an X to remove it; Backspace in an empty field removes the last tag.
   *
   * @param {Object} options
   * @param {string} options.tagListId
   * @param {string} options.inputId
   * @param {string} [options.restoreId] Button that restores the defaults.
   * @param {Array<string>} options.defaults Values used when nothing is saved.
   * @returns {Object} Controller with `getValues`, `setValues`, `restore`, and
   *   `commitPendingInput`.
   */
  var createTagField = function (options) {
    var tagList = byId(options.tagListId);
    var input = byId(options.inputId);
    var restoreButton = options.restoreId ? byId(options.restoreId) : null;

    var getValues = function () {
      return tagList.items.getAll().map(function (tag) {
        return tag.value;
      });
    };

    var addValue = function (value) {
      var trimmed = String(value).trim();

      if (!trimmed) {
        return false;
      }

      // Adding the same value twice would be meaningless, and the duplicate tag
      // could not be told apart from the original.
      if (
        getValues().some(function (existing) {
          return existing.toLowerCase() === trimmed.toLowerCase();
        })
      ) {
        return false;
      }

      var tag = document.createElement('coral-tag');
      tag.value = trimmed;
      tag.label.textContent = trimmed;
      tagList.items.add(tag);

      return true;
    };

    var setValues = function (values) {
      tagList.items.clear();
      (values || []).forEach(addValue);
    };

    /** Adds whatever is typed but not yet committed. */
    var commitPendingInput = function () {
      var added = addValue(input.value);
      input.value = '';
      return added;
    };

    input.addEventListener('keydown', function (event) {
      var key = event.key;

      if (key === 'Enter' || key === ',') {
        event.preventDefault();
        commitPendingInput();
        return;
      }

      if (key === 'Tab' && input.value.trim()) {
        // Commit and stay put, so several values can be typed in a row. Tab on
        // an empty field still moves focus the way it normally would.
        event.preventDefault();
        commitPendingInput();
        return;
      }

      if (key === 'Backspace' && !input.value) {
        var tags = tagList.items.getAll();

        if (tags.length) {
          tagList.items.remove(tags[tags.length - 1]);
        }
      }
    });

    // Typing a value and clicking Save directly should not silently drop it.
    input.addEventListener('blur', commitPendingInput);

    if (restoreButton) {
      restoreButton.addEventListener('click', function () {
        setValues(options.defaults);
        input.value = '';
        input.focus();
      });
    }

    return {
      getValues: getValues,
      setValues: setValues,
      restore: function () {
        setValues(options.defaults);
      },
      commitPendingInput: commitPendingInput
    };
  };

  /* ------------------------------------------------------------------ *
   * Field accessors
   * ------------------------------------------------------------------ */

  /** Sets a field's value, clearing it when the setting is absent. */
  var setValue = function (id, value) {
    var element = byId(id);

    if (element) {
      element.value = value === undefined || value === null ? '' : value;
    }
  };

  var getValue = function (id) {
    var element = byId(id);
    return element ? String(element.value) : '';
  };

  /** Reads a checkbox, falling back to the type's documented default. */
  var setChecked = function (id, value, defaultValue) {
    var element = byId(id);

    if (element) {
      element.checked =
        value === undefined ? Boolean(defaultValue) : Boolean(value);
    }
  };

  var isChecked = function (id) {
    var element = byId(id);
    return Boolean(element && element.checked);
  };

  /* ------------------------------------------------------------------ *
   * Validation
   * ------------------------------------------------------------------ */

  var showError = function (id, visible) {
    var element = byId(id);

    if (element) {
      element.hidden = !visible;
    }
  };

  /** Coral fields render their own error state from the `invalid` property. */
  var markInvalid = function (id, invalid) {
    var element = byId(id);

    if (element) {
      element.invalid = Boolean(invalid);
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
    createTagField: createTagField,
    getValue: getValue,
    isChecked: isChecked,
    markInvalid: markInvalid,
    renderDefaultValueNote: renderDefaultValueNote,
    setChecked: setChecked,
    setValue: setValue,
    showError: showError,
    validateSourceValue: validateSourceValue,
    wireDataElementButton: wireDataElementButton
  };
})();
