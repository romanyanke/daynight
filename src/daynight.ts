import tz from './timezones'
import sun from './sun'
import { getBrightness } from './brightness'

const timeZones = tz as Record<string, [number, number]>

export type Daynight = (options?: DaynightOptions) => DaynightResult
export interface DaynightOptions {
  /**
   * Force the timezone for the calculation
   * See [Advanced Usage][https://github.com/romanyanke/daynight#advanced-usage]
   */
  timeZone?: string
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

const daynight: Daynight = config => {
  const options = {
    ...getDefaultOptions(),
    ...config,
  }

  const coordinates = getTimeZoneCoordinates(options.timeZone)

  if (!coordinates) {
    throw new Error(`Timezone "${options.timeZone}" not found`)
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
    timezone: options.timeZone,
  }
}

const getDefaultOptions = (): Required<DaynightOptions> => ({
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  date: new Date(),
})

const getTimeZoneCoordinates = (timeZone: string): [number, number] | undefined =>
  timeZones[timeZone]

export default daynight
