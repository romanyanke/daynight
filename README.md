# 🌞 daynight 🌚

**Is it light or dark where your user is? Find out without asking them, in 6.9 KB.**

[![npm version](https://img.shields.io/npm/v/daynight.svg)](https://www.npmjs.com/package/daynight)
[![npm downloads](https://img.shields.io/npm/dm/daynight.svg)](https://www.npmjs.com/package/daynight)
[![Tests](https://github.com/romanyanke/daynight/actions/workflows/test.yml/badge.svg)](https://github.com/romanyanke/daynight/actions/workflows/test.yml)
[![License](https://img.shields.io/npm/l/daynight.svg)](LICENSE)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/daynight)](https://bundlephobia.com/package/daynight)

No permission prompt. No `navigator.geolocation`. No IP lookup. No network request at all — the answer comes from the timezone name the browser already knows.

<p align="center">
  <a href="https://romanyanke.github.io/daynight/">
    <img src="https://raw.githubusercontent.com/romanyanke/daynight/main/assets/hero.gif" width="440" alt="A spinning globe with the day/night terminator sweeping across it, one dot per timezone, each coloured by the brightness daynight() returns for it">
  </a>
</p>

<p align="center">
  <a href="https://romanyanke.github.io/daynight/"><b>▶ Open the live demo</b></a><br>
  <sub>Spin the globe, drag the clock a year in either direction, watch all 418 zones recompute — and read the exact call being made, live.</sub>
</p>

Every dot above is a real `daynight()` call. So is every frame: the image is generated from the library itself, not drawn by hand.

## Install

```sh
npm install daynight
```

## Use

```js
import daynight from 'daynight'

document.body.classList.toggle('dark', daynight().dark)
```

That is the whole thing. It is synchronous, it cannot fail over the network, and the user is never interrupted.

## Why not the usual options

|                         | Prompts the user | Needs the network | Synchronous | Tells you about daylight   |
| ----------------------- | ---------------- | ----------------- | ----------- | -------------------------- |
| `navigator.geolocation` | yes              | no                | no          | yes, exactly               |
| IP geolocation service  | no               | yes, third party  | no          | yes, unless on a VPN       |
| `prefers-color-scheme`  | no               | no                | yes         | no — it is a theme setting |
| **`daynight`**          | **no**           | **no**            | **yes**     | **yes, for the zone**      |

`prefers-color-scheme` tells you which theme someone picked, which is not the same question. Geolocation answers the right question but costs a permission dialog most people decline. This library trades exactness for never having to ask.

## How it works

1. **Ask the browser for its timezone.** `Intl.DateTimeFormat().resolvedOptions().timeZone` returns something like `Europe/Madrid`. No prompt, no permission, no network.
2. **Look up the centre of that zone.** A table of 418 zones, computed from real timezone boundaries and quantised to tenths of a degree to stay small.
3. **Work out the sun from there.** Sunrise and sunset for those coordinates on that date, then whether the given moment falls between them.

So the answer is an estimate for the middle of a timezone, not for a person. That is the trade: no geolocation prompt, no IP lookup, no third-party request — in exchange for being approximate at the edges of a zone.

## API

```ts
daynight(options?: DaynightOptions): DaynightResult
```

Both options are optional; by default it reads the browser's timezone and uses the current moment.

```js
daynight({
  timezone: 'Africa/Nairobi',
  date: new Date('2012-12-20T12:00'),
})
```

The result:

```ts
{
  theme: 'day' | 'night'
  brightness: number // 0 darkest … 1 brightest, exactly 0.5 at sunrise and sunset
  light: boolean
  dark: boolean
  sunrise: Date
  sunset: Date
  timezone: string // the zone name actually used
  coordinates: [number, number] // [longitude, latitude] of the zone centre
  polar: 'day' | 'night' | null
}
```

Types ship with the package (`DaynightResult`, `DaynightOptions`, `DaynightTheme`, `Daynight`), in both ESM and CommonJS builds.

## Recipes

**A dark theme that follows the actual sky, not a checkbox:**

```js
import daynight from 'daynight'

const apply = () => (document.documentElement.dataset.theme = daynight().theme)
apply()
setInterval(apply, 60_000)
```

**A gradient instead of a switch**, using `brightness` to dim continuously through dusk:

```js
document.documentElement.style.setProperty('--sky', daynight().brightness)
```

## Polar day and night

Inside the polar circles there are days with no sunrise or no sunset at all, and 22 of the timezone centre points sit there. For those days `polar` reports which case it is, and the usual fields follow it:

| `polar`   | meaning                                    | `light` | `brightness` |
| --------- | ------------------------------------------ | ------- | ------------ |
| `'day'`   | midnight sun — the sun never sets that day | `true`  | `1`          |
| `'night'` | polar night — the sun never rises          | `false` | `0`          |
| `null`    | an ordinary day                            | —       | computed     |

In both polar cases there is no real event for `sunrise`/`sunset` to report: they span the whole local day for `'day'` and collapse to local midnight for `'night'`. Check `polar` rather than comparing the two.

## Renamed timezones

IANA renames timezones over time (`Europe/Kiev` became `Europe/Kyiv`, `Asia/Calcutta` became `Asia/Kolkata`) and keeps the old names working as aliases. Which spelling a browser reports depends on the ICU version it ships with, so both are accepted — the `timezone` field of the result tells you which name was actually used.

## Limitations

- Accuracy is bounded by what the library works from: a timezone's centre point, not the user's actual position. A zone can span thousands of kilometres, so sunrise and sunset are estimates for the middle of it — and near the day/night boundary that difference can flip the answer for someone at the zone's edge.
- It throws if the browser has no `Intl`, or if the timezone is not one of the 418 it knows.

## Browser support

Timezone detection relies on the Internationalization API — see [Can I Use](https://caniuse.com/#feat=internationalization). Everything else is plain arithmetic.

## Changelog

Release notes live in [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE) © Roman Yanke
