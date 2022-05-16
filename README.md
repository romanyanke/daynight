# 🌞 Day or night 🌚

This script tries to guess is it dark or light now in the user's location. It doesn't ask for user location. It doesn't rely on IP addresses. It doesn't use bleeding-edge features (like DeviceLightEvent or light-level CSS media).

The script gets the timezone name. It finds the coordinates of the center of this timezone and uses this information to calculate sunrise and sunset time.

The result is more or less adequate, usually. See [demo here](https://romanyanke.github.io/daynight/).

## Browser compatibility

To get the timezone name, it uses Internationalization API https://caniuse.com/#feat=internationalization.

## Installation

```sh
npm install daynight --save-dev
```

## Usage

```js
import daynight from 'daynight'

const isLight = daynight().light
```

You can pass the time zone name and/or date as options. By default, it's the user's time zone and current date.

```js
daynight({
  timeZone: 'Africa/Nairobi',
  date: new Date('2012-12-20T12:00'),
})
```

The script fails when:

- Browser doesn't support Internationalization API
- Timezone is not found in the list of timezones.

## Result

```typescript
{
  coordinates: [number, number]
  dark: boolean
  light: boolean
  sunrise: Date
  sunset: Date
  timezone: string
  brightness: number
}
```

## Brightness

Brightness is a value between 0 and 1. Zero is the darkest value, and 1 is the most bright one. The brightness is 0.5 at sunrise and sunset.

## Changelog

See [Changelog.md](CHANGELOG.md).
