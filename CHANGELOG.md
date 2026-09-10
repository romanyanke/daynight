# Changelog

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
