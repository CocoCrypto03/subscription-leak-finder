# Good first issues

To create at publication time (`gh issue create` or the web UI), labeled `good first issue`.

---

### 1. Add a bank format: `formats/<your-bank>.json`

Add support for a bank that isn't covered yet (ING, Wise, HSBC, Monabanq, Fortuneo, Qonto, Monabanq, Nubank, a non-FR/US/UK bank, etc.). Copy an existing file in `formats/` as a template, fill in the real CSV header names your bank's export uses (delimiter, decimal separator, date format), add the filename to `formats/index.json`, and add a small fixture to `samples/` plus a check in `tests/run-tests.mjs`. See "Adding a bank format" in `CONTRIBUTING.md`.

### 2. Add merchants to `data/merchants.json`

The merchant dictionary is short. Pick a category (gaming, news, software, fitness, cloud storage...) and add 3-5 well-known subscription services with their normalized name, category, and **official** cancellation/management page link. One PR can add several entries at once if they're the same category.

### 3. Fix the same-day transaction edge case in recurrence detection

`js/detect.js`'s `buildChains()` breaks a recurring chain if two transactions for the same merchant land on the exact same calendar day (gap = 0 days matches no interval). This can happen with a refund + re-charge, or a trial charge and the first real charge posting on the same day. Make the chain-building step tolerant of a zero-day gap (e.g. treat it as "continue the current chain" rather than breaking it), and add a regression test in `tests/run-tests.mjs`.

### 4. Add a light theme

The app is dark-mode only today (`css/style.css`). Add a light theme behind `prefers-color-scheme: light` (and/or a manual toggle next to the language switcher), keeping contrast accessible (WCAG AA) in both modes.

### 5. Export the results table as CSV

Add a "Download as CSV" button next to "Download image (PNG)" in the results section that exports the detected subscriptions (merchant, category, frequency, monthly cost, yearly cost, flags) as a CSV file the user can open in a spreadsheet.

### 6. Multi-currency support

The app currently assumes a single currency and hardcodes the € sign in `js/app.js` (`money()`) and `js/card.js`. Detect the currency from the file (OFX has a `<CURDEF>` tag; some bank CSVs have a currency column) or let the user pick one, and format amounts accordingly (`Intl.NumberFormat`).

### 7. Add another UI language

`js/i18n.js` has an `EN`/`FR` dictionary with a simple `t(key)` lookup. Add a new language (Spanish, German, Portuguese...) by adding a new top-level key to the `STRINGS` object with the same keys translated, and wire a way to select it (e.g. extend `lang.toggle` to cycle, or add a small select).

### 8. Detect quarterly billing more robustly

Quarterly (every ~91 days) is the least common interval and the hardest to detect with only 2 occurrences. Look at `MIN_OCCURRENCES` and `INTERVALS` in `js/detect.js` and improve the heuristic (e.g. widen tolerance slightly, or require corroborating evidence like a round amount) without creating more false positives — add before/after test cases in `tests/run-tests.mjs` to show the improvement.
