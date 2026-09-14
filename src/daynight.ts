import { timezones as tz } from './timeZones'
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

  const quantizedCoordinates = getTimeZoneCoordinates(options.timezone)

  if (!quantizedCoordinates) {
    throw new Error(`Timezone "${options.timezone}" not found`)
  }

  // Coordinates are stored as degrees * 10 (see src/timeZones.ts) to keep the
  // data file small.
  const coordinates: [number, number] = [quantizedCoordinates[0] / 10, quantizedCoordinates[1] / 10]
  const [lon, lat] = coordinates
  const offsetMinutes = getTimeZoneOffsetMinutes(options.date, options.timezone)
  const { sunrise, sunset } = sun(options.date, lon, lat, offsetMinutes)
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

// UTC offset, in minutes, of `timezone` at `date` (same sign convention as
// Date.prototype.getTimezoneOffset(): positive west of UTC). Computed from
// the requested IANA timezone rather than the host machine's own timezone,
// since sun.ts previously used `date.getTimezoneOffset()` directly, which
// silently gave wrong results whenever the process ran in a different
// timezone than the one being asked about (e.g. in CI).
const getTimeZoneOffsetMinutes = (date: Date, timezone: string): number =>
  (asUTCMillis(date, 'UTC') - asUTCMillis(date, timezone)) / 60000

const asUTCMillis = (date: Date, timezone: string): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const get = (type: string) =>
    Number(parts.find((part: Intl.DateTimeFormatPart) => part.type === type)?.value)
  return Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  )
}

const getTimeZoneCoordinates = (timezone: string): [number, number] | undefined => {
  const path = timezone.split('/')
  // find by parts in the timeZone

  let region: any = timezones
  for (const part of path) {
    if (typeof region === 'object') {
      region = region[part]
    }
  }

  return Array.isArray(region) ? (region as [number, number]) : undefined
}
