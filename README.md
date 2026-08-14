<div align="center">

<img src="resources/icons/friendly-format.svg" alt="Friendly Format" width="88" height="88">

# Friendly Format

**Type conversion data elements for Adobe Experience Platform Data Collection**

Turn the strings in your data layer into the Booleans, integers, and doubles
that XDM actually expects — in the Tags runtime, before the data ever leaves
the page.

[![Platform](https://img.shields.io/badge/platform-web-1473E6)](https://experienceleague.adobe.com/en/docs/experience-platform/tags/extension-dev/overview)
[![Extension version](https://img.shields.io/badge/version-1.0.0-2680EB)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-Apache--2.0-6E6E6E)](LICENSE)
[![Dependencies](https://img.shields.io/badge/runtime%20dependencies-none-268E6C)](#design-notes)

</div>

---

## The problem

Data layers are stringly typed. XDM is not. A schema field declared as a Boolean
rejects `"true"`, a `measure` field rejects `"$1,234.56"`, and an empty string
sent to an integer field fails validation outright. The usual workaround is a
one-off custom code data element per field, each with its own quietly different
opinion about what `""`, `null`, and `"maybe"` should mean.

Friendly Format replaces those snippets with three configurable data element
types.

| Data layer value | Sent without conversion | Sent with Friendly Format |
| --- | --- | --- |
| `"Yes"` | `"Yes"` — rejected by a Boolean field | `true` |
| `"$1,234.56"` | `"$1,234.56"` — rejected by a measure field | `1234.56` |
| `"2.6"` | `"2.6"` — rejected by an integer field | `3` |
| `""` | `""` — rejected, or stored as an empty string | field omitted, or `null`, your choice |
| `null` | inconsistent, depending on the source | your choice, set explicitly |

```mermaid
flowchart LR
    A["Data layer<br/><code>'Yes'</code>"] --> B["Source data element<br/><code>%rawLoggedIn%</code>"]
    B --> C["Friendly Format<br/>String to Boolean"]
    C --> D["XDM object<br/><code>true</code>"]
    D --> E["Web SDK → Platform"]
```

---

## Contents

- [Data element types](#data-element-types)
  - [String to Boolean](#string-to-boolean)
  - [String to Integer](#string-to-integer)
  - [String to Double](#string-to-double)
- [Edge cases and the Default Value trap](#edge-cases-and-the-default-value-trap)
- [Installation](#installation)
- [Walkthrough](#walkthrough)
- [Local development](#local-development)
- [Project layout](#project-layout)
- [Packaging and submission](#packaging-and-submission)
- [Design notes](#design-notes)
- [Contributing](#contributing)
- [License](#license)

---

## Data element types

All three types share the same shape: a **Value to convert** field — normally a
data element token such as `%rawLoggedIn%`, insertable with the *Add data
element* button — plus parsing options and three explicit edge-case settings.
Full reference: [`docs/data-element-types.md`](docs/data-element-types.md).

### String to Boolean

Matches the input against a list of true values and a list of false values.

| Setting | Default |
| --- | --- |
| Values treated as true | `true, yes, y, 1, on, t` |
| Values treated as false | `false, no, n, 0, off, f` |
| Trim surrounding whitespace | on |
| Match case sensitively | off |
| When the value matches neither list | use the data element's default value |
| When the value is empty or only whitespace | use the data element's default value |
| When the value is null or undefined | use the data element's default value |

```text
"Yes"      → true          "off"    → false
"  TRUE  " → true          "0"      → false
"maybe"    → your choice: truthiness, true, false, null, or unset
```

Both lists are editable, so `Enabled` / `Disabled` or `Y` / `N` work as well as
the defaults. **Truthiness conversion** handles "treat anything that is not
explicitly false as true": it judges numeric strings numerically, so `"2"` is
`true` while `"0.0"` and `"-0"` are `false`, and everything else non-empty is
`true`. A value that is already a Boolean passes through untouched.

### String to Integer

Parses a number, then reduces it to a whole number.

| Setting | Default |
| --- | --- |
| Trim surrounding whitespace | on |
| Strip non-numeric characters | off |
| Require the whole value to be numeric | on |
| When the value has a decimal part | round |
| When the value cannot be parsed | use the data element's default value |
| When the value is empty or only whitespace | use the data element's default value |
| When the value is null or undefined | use the data element's default value |

```text
"42"      → 42            "-12.6" → -13   (round)
"$1,234"  → 1234          "-12.6" → -12   (truncate)
"12abc"   → invalid, or 12 with the whole-value requirement off
```

Decimal input can be rounded, truncated toward zero, rounded down, rounded up,
or rejected as invalid.

### String to Double

Parses a number and optionally rounds it to a fixed number of decimal places.

| Setting | Default |
| --- | --- |
| Trim surrounding whitespace | on |
| Strip non-numeric characters | off |
| Require the whole value to be numeric | on |
| Decimal separator | period |
| Decimal places | unset, full precision |
| When the value cannot be parsed | use the data element's default value |
| When the value is empty or only whitespace | use the data element's default value |
| When the value is null or undefined | use the data element's default value |

```text
"19.99"      → 19.99      "1.234,56" → 1234.56  (comma notation)
".5"         → 0.5        "€1.234,56" → 1234.56 (comma + stripping)
"19.9876"    → 19.99      (2 decimal places)
```

---

## Edge cases and the Default Value trap

Every type answers three questions explicitly, rather than guessing:

| Input | Setting | Options |
| --- | --- | --- |
| `null` or `undefined` | *When the value is null or undefined* | leave unset · `null` · a typed fallback |
| `""` or `"   "` | *When the value is empty or only whitespace* | leave unset · `null` · a typed fallback |
| `"maybe"`, `"abc"` | *When the value cannot be interpreted* | leave unset · `null` · a typed fallback |

> [!WARNING]
> **Leave the data element's Default Value field empty.**
>
> Tags replaces a data element's result with its **Default Value** whenever that
> result is `null` or `undefined`. Filling that field overrides the settings
> above: *Return null* stops returning null, and *Use the data element's default
> value* stops leaving the field unset.
>
> It is also a type hazard. The Default Value field is free text, so whatever
> you type arrives as a **string** — `false` becomes `"false"` and `0` becomes
> `"0"`, which is exactly the mistyping this extension exists to prevent.
>
> For the same reason, leave **Force lowercase** and **Clean text** switched
> off. Both are string operations, and both convert a typed result back into a
> string.

Choose deliberately between the two clean outcomes:

- **`null`** — the field is sent with a null value, which **clears** it in
  Platform. Choose *Return null* and leave Default Value empty.
- **`undefined`** — the field is **omitted** from the payload, leaving any
  existing profile value untouched. Choose *Use the data element's default
  value* and leave Default Value empty.

This warning is repeated inside each data element view, next to the settings it
affects.

---

## Installation

Once the extension is published to the Data Collection catalog:

1. In the Data Collection UI, open your property and go to **Extensions →
   Catalog**.
2. Find **Friendly Format** and select **Install**.
3. Create a data element, choose **Friendly Format** as the extension, then pick
   **String to Boolean**, **String to Integer**, or **String to Double**.

To try it before publication, upload the package to your own organization —
see [Packaging and submission](#packaging-and-submission).

---

## Walkthrough

Converting a `"Yes"` / `"No"` login flag into a real Boolean:

1. **Create the source data element.** Any type that reads your raw string — a
   JavaScript variable pointing at `digitalData.user.loggedIn`, for example.
   Name it `rawLoggedIn`.
2. **Create the converted data element.** Extension **Friendly Format**, type
   **String to Boolean**, name it `loggedIn`.
3. **Set the value to convert.** Select *Add data element*, pick `rawLoggedIn`,
   which inserts `%rawLoggedIn%`.
4. **Decide the edge cases.** For a login flag, "not logged in unless told
   otherwise" is usually right: set empty and null to **Return false**, and
   leave unmatched values on **Use the data element's default value** so a
   surprise value shows up as missing rather than as a confident `false`.
5. **Leave Default Value empty.** See the warning above.
6. **Map it.** In your XDM object, map `%loggedIn%` to the Boolean field.

Verify in the browser console before publishing:

```js
_satellite.getVar('loggedIn');          // true
typeof _satellite.getVar('loggedIn');   // "boolean", not "string"
```

---

## Local development

```bash
npm install
npm test          # unit tests for the library modules (node:test, no browser needed)
npm run validate  # reactor-validator: checks extension.json against the manifest schema
npm run sandbox   # serves views at https://localhost:4000
```

With the sandbox running:

- **Views** — open <https://localhost:4000> and pick a data element type to
  exercise the configuration UI, including validation and saved settings.
- **Runtime** — open <https://localhost:4000/libSandbox.html> and evaluate the
  sample data elements defined in [`.sandbox/container.js`](.sandbox/container.js):

  ```js
  localStorage.setItem('loggedIn', 'Yes');
  localStorage.setItem('cartQuantity', '2.6');
  localStorage.setItem('orderTotal', '$1,234.567');

  _satellite.getVar('loggedIn');     // true
  _satellite.getVar('cartQuantity'); // 3
  _satellite.getVar('orderTotal');   // 1234.57
  ```

The sandbox serves over a self-signed certificate, so accept the browser warning
the first time.

---

## Project layout

```
extension.json                  Manifest: the three data element types and their setting schemas
src/lib/dataElements/           Runtime library modules, one per type (CommonJS, ES5)
src/lib/helpers/                Shared edge-case and numeric-parsing logic
src/view/dataElements/          Configuration views shown in the Tags UI
src/view/scripts|styles/        Shared view helpers and styling
resources/icons/                Extension icon
tests/                          Unit tests for the library modules
docs/                           Option reference and submission checklist
.sandbox/container.js           Sample data elements for local sandbox testing
```

---

## Packaging and submission

```bash
npm run package   # builds package-friendly-format-<version>.zip
npm run upload    # uploads the zip using Adobe OAuth Server-to-Server credentials
npm run release   # moves the uploaded version from development to private
```

[`docs/submission.md`](docs/submission.md) walks through the full Adobe
[submission path](https://experienceleague.adobe.com/en/docs/experience-platform/tags/extension-dev/submit/overview)
— org setup, permissions, Exchange listing, upload, and release — and tracks
what still needs a real value before submission: the Exchange URL, author
contact, and the placeholder icon.

---

## Design notes

- **No runtime dependencies.** The library modules are plain ES5 CommonJS,
  adding a few kilobytes to the Tags library. The views are hand-written HTML
  with no component framework, so the package stays small and needs no build
  step.
- **Conversion happens once, in the runtime.** Downstream rules, actions, and
  XDM mappings all read the already-typed value.
- **Nothing is guessed silently.** Every ambiguous input has a setting, and the
  default for all of them is to leave the value unset rather than invent one.
- **Known limits.** Stripping non-numeric characters also strips exponent
  notation, and integers beyond `Number.MAX_SAFE_INTEGER` lose precision as they
  do anywhere in JavaScript. Both are documented in
  [`docs/data-element-types.md`](docs/data-element-types.md#caveats).

---

## Contributing

Issues and pull requests are welcome at
<https://github.com/andylunsford/FriendlyFormat>. Please run `npm test` and
`npm run validate` before opening a pull request, and add unit tests for any new
conversion behavior. Changes to the runtime modules should stay ES5 and
dependency free.

---

## License

Apache-2.0. See [LICENSE](LICENSE).
