# Changelog

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
