# Day or night

This script tries to guess is it dark or light now in the user's area. It doesn't ask user location it doesn't rely on ip address it doesn't use bleeding edge features (like [DeviceLightEvent](https://developer.mozilla.org/en-US/docs/Web/API/DeviceLightEvent/Using_light_sensors) or [light-level CSS media](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/light-level)).

The script checks the [timezone name](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) and match it to the center coordinates of this timezone and use this information to calculate sunrise and sunset time. The script returns `true` before the sunset (meaning it's light) and `false` after the sunset (it's dark).

## Installation

```
npm install daynight --save-dev
```

## Usage

```
import daynight from 'daynight'

const isDaylight = daynight()
const theme = isDaylight ? 'light' : 'dark'
```

## Browser compatibility

To get the timezone name it uses Internationalization API https://caniuse.com/#feat=internationalization
