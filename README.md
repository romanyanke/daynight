# Day or night

This script tries to guess is it dark or light now in the user's area. It doesn't ask user location it doesn't rely on ip address it doesn't use bleeding edge features (like [DeviceLightEvent](https://developer.mozilla.org/en-US/docs/Web/API/DeviceLightEvent/Using_light_sensors) or [light-level CSS media](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/light-level)).

The script checks the [timezone name](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) and match it to the center coordinates of this timezone and use this information to calculate sunrise and sunset time. The script returns `true` before the sunset (meaning it's light) and `false` after the sunset (it's dark).

## Installation

```sh
npm install daynight --save-dev
```

## Usage

```js
import daynight from 'daynight'

const isDaylight = daynight()
const theme = isDaylight ? 'light' : 'dark'
```

## Browser compatibility

To get the timezone name it uses Internationalization API https://caniuse.com/#feat=internationalization

## Options

If script fails it returns `true` by default. The default value can be overwritten by passing that value as a parameter:

```js
const isDaylight = daynight(true)
```

The script fails when:

- Browser doesn't support Internationalization API
- User's timezone is not found in the list of timezones (not sure if this is a real case)
