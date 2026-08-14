# Friendly Format

Adobe Experience Platform Data Collection (Tags) extension that turns strings
into the primitive types XDM expects: **Boolean**, **integer**, and **double**.

Web data layers are full of stringly-typed values — `"true"`, `"Yes"`,
`"$1,234.56"`, `""` — while XDM schemas are strict about types. Friendly Format
adds three data element types that do the conversion in the Tags runtime, with
explicit control over the cases that usually cause ingestion failures: null,
empty strings, whitespace, and values that do not parse.

## Data element types

| Type | Returns | Typical use |
| --- | --- | --- |
| **String to Boolean** | `true` / `false` | `"Yes"`, `"on"`, `"1"` → `true` |
| **String to Integer** | whole number | `"$1,234"` → `1234`, `"2.6"` → `3` |
| **String to Double** | floating point number | `"1.234,56"` → `1234.56` |

Every type takes a **Value to convert**, which is normally a data element token
such as `%rawLoggedIn%`, and exposes the same three edge-case settings — what to
return when the input is `null`/`undefined`, when it is empty or whitespace
only, and when it cannot be interpreted. See
[docs/data-element-types.md](docs/data-element-types.md) for the full option
reference and conversion tables.

## Project layout

```
extension.json                  Manifest: the three data element types and their setting schemas
src/lib/dataElements/           Runtime library modules, one per type (CommonJS, ES5)
src/lib/helpers/                Shared edge-case and numeric-parsing logic
src/view/dataElements/          Configuration views shown in the Tags UI
src/view/scripts|styles/        Shared view helpers and styling
resources/icons/                Extension icon
tests/                          Unit tests for the library modules
.sandbox/container.js           Sample data elements for local sandbox testing
```

## Local development

```bash
npm install
npm test          # unit tests for the library modules (node:test, no browser)
npm run validate  # reactor-validator: checks extension.json against the manifest schema
npm run sandbox   # serves the views and a runtime library at https://localhost:4000
```

With the sandbox running:

- **Views** — open <https://localhost:4000> and pick a data element type to
  exercise the configuration UI, including validation and saved settings.
- **Runtime** — open <https://localhost:4000/libSandbox.html> and evaluate the
  sample data elements defined in `.sandbox/container.js`:

  ```js
  localStorage.setItem('loggedIn', 'Yes');
  _satellite.getVar('loggedIn'); // true (a real Boolean, not "true")
  ```

The sandbox serves over a self-signed certificate, so accept the browser warning
the first time.

## Packaging and submission

```bash
npm run package   # builds package-friendly-format-<version>.zip
npm run upload    # uploads the zip using Adobe I/O technical account credentials
npm run release   # makes the uploaded version private, then public
```

[docs/submission.md](docs/submission.md) walks through the full Adobe
submission path — org setup, permissions, Exchange listing, upload, and release
— and lists what still needs a real value before this extension can be
submitted (Exchange URL, author details, icon).

## License

Apache-2.0. See [LICENSE](LICENSE).
