# 🌞 Day or Night 🌚

## Overview

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
  timeZone: 'Africa/Nairobi',
  date: new Date('2012-12-20T12:00'),
})
```

## Limitations

The script will not function correctly under the following conditions:

- The browser lacks support for the Internationalization API.
- The specified timezone is not recognized in the timezone list.

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
  theme: 'day' | 'night'
}
```

## Brightness Calculation

The `brightness` value ranges from 0 (darkest) to 1 (brightest). It is set to 0.5 at both sunrise and sunset.

## Updates and Changes

Stay updated with the latest changes and improvements by checking our [Changelog.md](CHANGELOG.md).
