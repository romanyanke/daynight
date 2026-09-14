# Changelog

## 4.1.1

- No code changes. `4.1.0` was staged on npm (`npm stage publish`) but its staging window expired before it could be approved, and npm permanently reserves version numbers once staged — so it could never be re-staged. Republished as `4.1.1`.

## 4.1.0

- **Fix: results no longer depend on the host machine's local timezone.** `sun.ts` computed a correction from `Date.prototype.getTimezoneOffset()`, which reflects the *process's own* timezone rather than the requested `timezone` option. Whenever the two differed (e.g. any CI runner set to UTC, computing for `Asia/Novosibirsk` or `Europe/Moscow`), sunrise/sunset — and therefore `light`/`dark` — could come out wrong, especially near sunrise/sunset transitions or white nights. `sun.ts` now takes an explicit UTC offset for the requested timezone (computed via `Intl.DateTimeFormat`) instead of reading the host's own offset, and no longer touches any local (non-UTC) `Date` getter/setter. Verified across several `TZ` values.
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
