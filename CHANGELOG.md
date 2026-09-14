# Changelog

## 4.2.0

- **Fix: polar day and night are no longer reported as ordinary nights.** `sun.ts` already computed everything needed to tell the two cases apart, but the upstream `Sunrise`/`Sunset` flags were left commented out, so both came back as `sunrise === sunset ===` local midnight. `Arctic/Longyearbyen` at the height of the midnight sun reported `light: false` with a brightness of 0.42. This is not an edge case the data avoids — 22 of the ~420 zone centre points lie inside the polar circles, all of Antarctica among them. Results now carry a `polar: 'day' | 'night' | null` field (additive; no existing field changed type), and both polar cases are handled explicitly instead of being run through a zero-length day.
- **Fix: renamed timezones no longer throw.** IANA renames zones and keeps the old names as aliases, and which spelling `Intl` reports depends on the runtime's ICU version. The coordinate table holds current names, so on ICU 78 — which still reports `Europe/Kiev` — `daynight()` threw for every user in Kyiv, and likewise for `Asia/Calcutta`, `America/Buenos_Aires` and ~16 others. Both the query and the table keys are now canonicalised through `Intl` itself, so a name and its alias collapse onto whichever spelling the runtime prefers; no alias table to maintain. The index is built lazily, only after a direct lookup misses.
- **Fix: timezone centre points that fell outside their own zone.** The generator took the centroid of a zone's whole MultiPolygon, so zones with far-flung parts landed in open water: `Australia/Perth` at `[133.5, -64.6]` in the Southern Ocean (sunrise computed for latitude -64.6 instead of roughly -32), `America/Argentina/Ushuaia` at `[-53.9, -77]` in Antarctica. It now takes a representative part — ignoring uninhabited Antarctic claims for zones outside `Antarctica/*` — and a point guaranteed to lie inside it.
- Regenerated the coordinate table from timezone-boundary-builder 2026c, which adds `America/Coyhaique` (tzdata 2025a). All 418 zones `Intl.supportedValuesOf('timeZone')` reports now resolve, up from 398.
- **Fix: white nights reported local noon as night.** Sunrise and sunset are found by scanning a single local calendar day. Just south of the Arctic circle in June the sun sets after midnight and rises again an hour or two later, so the sunset found on that day belongs to the night that began the day before and lands _before_ that day's sunrise — making `date > sunset` true at local noon. The sunset is now carried to the day it actually belongs to. On the previous release this affected eight zones on the June solstice, `Atlantic/Reykjavik`, `America/Anchorage` and `America/Nome` among them.
- **Performance: cache `Intl.DateTimeFormat` instances by zone.** Two formatters were constructed on every call, which dominated the cost. A pass over every timezone went from 25.4ms to 10.4ms — and that is 418 zones now against 398 before.
- Bundle: 12704 → 13417 bytes raw, 6655 → 6980 gzipped.
- Fixed the `scripts/generate.mjs` pipeline, which could not run as documented: its JSON imports used `assert { type: 'json' }` (dropped in Node 22), reported as a missing `combined.json`, and the first run returned nothing instead of the table it had just computed, so it only worked when invoked twice.
- Rebuilt the [demo](https://romanyanke.github.io/daynight/) as a landing page. It plots every timezone on a world map, each dot coloured by the `brightness` reported for it, and a time slider sweeps the day/night line across — 418 real `daynight()` calls per frame, which is also how these fixes were found. The visitor's own result leads the page, shown as the chain that produced it rather than a bare verdict. The old page's Yandex static-maps image is gone, and with it a third-party request carrying the user's coordinates.
- Fixed a leak in the test suite: the "Intl is not supported" case stubbed out `global.Intl` without restoring it, failing any test declared after it.

## 4.1.0

- **Fix: results no longer depend on the host machine's local timezone.** `sun.ts` computed a correction from `Date.prototype.getTimezoneOffset()`, which reflects the _process's own_ timezone rather than the requested `timezone` option. Whenever the two differed (e.g. any CI runner set to UTC, computing for `Asia/Novosibirsk` or `Europe/Moscow`), sunrise/sunset — and therefore `light`/`dark` — could come out wrong, especially near sunrise/sunset transitions or white nights. `sun.ts` now takes an explicit UTC offset for the requested timezone (computed via `Intl.DateTimeFormat`) instead of reading the host's own offset, and no longer touches any local (non-UTC) `Date` getter/setter. Verified across several `TZ` values.
- Shrink the runtime bundle (`dist/esm/index.js`): −31% raw, −15% gzip, −17% brotli.
  - Store timezone coordinates as integer degrees ×10 instead of one-decimal floats (e.g. `-603` instead of `-60.3`), halved back on read. A binary+base64 packing was tried first but rejected: it shrank the raw file yet compressed worse than gzip/brotli-friendly decimal text, making the real (compressed) transfer size larger.
  - Switch `build:cjs`/`build:esm` from raw `tsc` (5 unminified files per target) to a single minified `esbuild` bundle per target. `.d.ts` generation is unchanged (`tsc --emitDeclarationOnly`), and source maps are still generated and published.
  - Fix `scripts/generate.mjs` writing to `src/timezones.ts` (lowercase `z`) while `src/daynight.ts` imports `./timeZones` — silently broken on case-sensitive filesystems (e.g. Linux CI).
  - `daynight({ timezone: 'Africa' })` (a region without a leaf city) now throws the documented `Timezone "..." not found` error instead of an unhandled `TypeError`.

## 4.0.5

- Fix a broken `4.0.4` tarball. It was published without a build, so it shipped no `dist/` at all and any `import 'daynight'` failed to resolve. Add a `prepublishOnly` script that runs `npm run build`, so the build can no longer be skipped on publish.

## 4.0.4

Tooling and CI only. The published library code is unchanged.

- Update dev dependencies: vitest 4.1.11 and prettier 3.9.6. Clears all npm audit advisories.
- Fix the CI Node version. Both workflows ran Node 16, which vitest 4 does not support, so `npm test` would have failed on release.
- Remove a dead `rollup.config.js`. The build has been running on `tsc`, and none of the plugins it imported were installed.
- Add an `npm run format` script and a `.prettierignore`.
- Build the [demo](https://romanyanke.github.io/daynight/) from source instead of installing `daynight@latest` from npm, so the published demo matches `main`.

## 4.0.3

- Fix a missing README on npmjs.com. This should not affect the installation or usage of the package.

## 4.0.2

- Dependabot alerts, audit fix and update dependencies.

## 4.0.1

- Trying to fix a missing README on npmjs.com

## 4.0.0

- Rename the `timezone` option.

```diff
      daynight({
-        timeZone: 'Australia/Sydney',
+        timezone: 'Australia/Sydney',
      }),
```

- Update the [demo](https://romanyanke.github.io/daynight/).
- Generate CJS, ESM modules and type declarations.

## 3.3.1

- Update TypeScript types and Readme.md

## 3.3.0

- Add `type DaynightTheme = 'day' | 'night'` to the `DaynightResult`

## 3.2.0

- Reduce bundle size by minifying timezone names

### 3.1.1

- Dependabot alerts

## 3.1.0

- Add brightness value

### 3.0.6

- Dependencies update

### 3.0.5

- Dependencies update

### 3.0.4

- Dependencies update

### 3.0.3

- Dependencies update

### 3.0.2

- Dependencies update

### 3.0.1

- Security vulnerability update

## 3.0.0

### ⚠ BREAKING CHANGES

- DaynightError interface is not exported anymore. Error prop in DaynightSuccess is omitted
- Do not handle error when Intl API is not supported
