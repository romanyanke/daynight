import { timezones as tz } from './timezones'
import sun from './sun'
import { getBrightness } from './brightness'

interface Coordinates {
  [index: number]: number
}

interface TimeZoneRegion {
  [city: string]: Coordinates | TimeZoneRegion
}

interface TimeZones {
  [region: string]: TimeZoneRegion
}

const timezones = tz as TimeZones

export type Daynight = (options?: DaynightOptions) => DaynightResult
export interface DaynightOptions {
  /**
   * Force the timezone for the calculation
   * See [Advanced Usage][https://github.com/romanyanke/daynight#advanced-usage]
   */
  timezone?: string
  /**
   * Force the date for the calculation
   * See [Advanced Usage][https://github.com/romanyanke/daynight#advanced-usage]
   */
  date?: Date
}

export type DaynightTheme = 'day' | 'night'

export interface DaynightResult {
  /**
   * The theme of the daynight: `day` when the `light` is true, `night` when the `dark` is true.
   */
  theme: DaynightTheme
  /**
   * The brightness of the daynight. The value from 0 to 1.
   * See [Brightness Calculation](https://github.com/romanyanke/daynight#brightness-calculation)
   */
  brightness: number
  /**
   * The timezone used for the calculation
   */
  timezone: string
  /**
   * Coordinates of the center of the timezone
   */
  coordinates: [number, number]
  /**
   * True if the sun is above the horizon
   */
  light: boolean
  /**
   * True if the sun is below the horizon
   */
  dark: boolean
  /**
   * Estimated time of sunset
   */
  sunset: Date
  /**
   * Estimated time of sunrise
   */
  sunrise: Date
}

export const daynight: Daynight = config => {
  const options = {
    ...getDefaultOptions(),
    ...config,
  }

  const coordinates = getTimeZoneCoordinates(options.timezone)

  if (!coordinates) {
    throw new Error(`Timezone "${options.timezone}" not found`)
  }

  const [lon, lat] = coordinates
  const { sunrise, sunset } = sun(options.date, lon, lat)
  const brightness = getBrightness([sunrise, sunset])(options.date)
  const dark = options.date < sunrise || options.date > sunset
  const light = !dark
  const theme: DaynightTheme = dark ? 'night' : 'day'

  return {
    brightness,
    coordinates,
    dark,
    light,
    sunrise,
    sunset,
    theme,
    timezone: options.timezone,
  }
}

const getDefaultOptions = (): Required<DaynightOptions> => ({
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  date: new Date(),
})

const getTimeZoneCoordinates = (timezone: string): [number, number] | undefined => {
  const path = timezone.split('/')
  // find by parts in the timeZone

  let region: any = timezones
  for (const part of path) {
    if (typeof region === 'object') {
      region = region[part]
    }
  }

  return region
}
