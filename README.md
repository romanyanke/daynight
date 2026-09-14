# 🌞 Day or Night 🌚

[![npm version](https://img.shields.io/npm/v/daynight.svg)](https://www.npmjs.com/package/daynight)
[![npm downloads](https://img.shields.io/npm/dm/daynight.svg)](https://www.npmjs.com/package/daynight)
[![Tests](https://github.com/romanyanke/daynight/actions/workflows/test.yml/badge.svg)](https://github.com/romanyanke/daynight/actions/workflows/test.yml)
[![License](https://img.shields.io/npm/l/daynight.svg)](LICENSE)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/daynight)](https://bundlephobia.com/package/daynight)

"Day or Night" is a lightweight JavaScript utility designed to determine whether it is currently day or night in the user's location. Remarkably, this script accomplishes its task without requesting the user's location, relying on IP addresses, or utilizing advanced web features like `DeviceLightEvent` or light-level CSS media queries.

## How It Works

The script operates by first acquiring the user's timezone name. It then calculates the geographical coordinates of the center of this timezone. Using these coordinates, "Day or Night" determines the local sunrise and sunset times to assess whether it is day or night.

The results are generally accurate. For a practical demonstration, visit our [live demo](https://romanyanke.github.io/daynight/).

## Browser Compatibility

"Day or Night" relies on the Internationalization API for timezone detection. For browser compatibility details, please refer to [Can I Use](https://caniuse.com/#feat=internationalization).

## Installation

Install "Day or Night" using npm with the following command:

```sh
npm install daynight --save
```

## Usage

Basic usage involves importing the daynight function and calling it to determine if it's light or dark:

```js
import daynight from 'daynight'

const isLight = daynight().light
```

## Advanced Usage

You can customize the function by passing a specific timezone and/or date:

```js
daynight({
  timezone: 'Africa/Nairobi',
  date: new Date('2012-12-20T12:00'),
})
```

## Limitations

The script will not function correctly under the following conditions:

- The browser lacks support for the Internationalization API.
- The specified timezone is not recognized in the timezone list.

Accuracy is also inherently limited by what the library works from: a timezone's centre point, not the user's actual position. A zone can span thousands of kilometres, so sunrise and sunset are estimates for the middle of it — and near the day/night boundary that difference can flip the answer for someone at the zone's edge.

## Output Structure

The function returns an object with the following structure:

```typescript
{
  coordinates: [number, number],
  dark: boolean,
  light: boolean,
  sunrise: Date,
  sunset: Date,
  timezone: string,
  brightness: number,
  theme: 'day' | 'night',
  polar: 'day' | 'night' | null
}
```

## Brightness Calculation

The `brightness` value ranges from 0 (darkest) to 1 (brightest). It is set to 0.5 at both sunrise and sunset.

## Polar Day and Night

Inside the polar circles there are days with no sunrise or no sunset at all, and 22 of the timezone centre points sit there. For those days `polar` reports which case it is, and the usual fields follow it:

| `polar`   | meaning                                    | `light` | `brightness` |
| --------- | ------------------------------------------ | ------- | ------------ |
| `'day'`   | midnight sun — the sun never sets that day | `true`  | `1`          |
| `'night'` | polar night — the sun never rises          | `false` | `0`          |
| `null`    | an ordinary day                            | —       | computed     |

In both polar cases there is no real event for `sunrise`/`sunset` to report: they span the whole local day for `'day'` and collapse to local midnight for `'night'`. Check `polar` rather than comparing the two.

## Renamed Timezones

IANA renames timezones over time (`Europe/Kiev` became `Europe/Kyiv`, `Asia/Calcutta` became `Asia/Kolkata`) and keeps the old names working as aliases. Which spelling a browser reports depends on the ICU version it ships with, so both are accepted — the `timezone` field of the result tells you which name was actually used.

## Updates and Changes

Stay updated with the latest changes and improvements by checking our [Changelog.md](CHANGELOG.md).
