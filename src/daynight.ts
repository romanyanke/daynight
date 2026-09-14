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
  /**
   * `'day'` during the midnight sun (the sun never sets that day), `'night'`
   * during the polar night (it never rises), `null` the rest of the time.
   * In both polar cases `sunrise`/`sunset` have no real event to report:
   * they span the whole local day for `'day'` and collapse to local midnight
   * for `'night'`. Use this field rather than comparing them.
   */
  polar: 'day' | 'night' | null
}

export const daynight: Daynight = config => {
  const options = {
    ...getDefaultOptions(),
    ...config,
  }

  const timezone = resolveTimeZone(options.timezone)

  if (!timezone) {
    throw new Error(`Timezone "${options.timezone}" not found`)
  }

  const quantizedCoordinates = getTimeZoneCoordinates(timezone)!

  // Coordinates are stored as degrees * 10 (see src/timeZones.ts) to keep the
  // data file small.
  const coordinates: [number, number] = [quantizedCoordinates[0] / 10, quantizedCoordinates[1] / 10]
  const [lon, lat] = coordinates
  const offsetMinutes = getTimeZoneOffsetMinutes(options.date, timezone)
  const { sunrise, sunset, polar } = sun(options.date, lon, lat, offsetMinutes)

  // Inside the polar circles there is no sunrise/sunset to interpolate
  // between, so brightness is decided by the case itself. Feeding these
  // through getBrightness() would divide by a zero-length day and return a
  // meaningless value (e.g. 0.42 for Longyearbyen at the height of the
  // midnight sun).
  const dark =
    polar === 'day'
      ? false
      : polar === 'night'
        ? true
        : options.date < sunrise || options.date > sunset
  const brightness =
    polar === 'day' ? 1 : polar === 'night' ? 0 : getBrightness([sunrise, sunset])(options.date)
  const light = !dark
  const theme: DaynightTheme = dark ? 'night' : 'day'

  return {
    brightness,
    coordinates,
    dark,
    light,
    polar,
    sunrise,
    sunset,
    theme,
    timezone,
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

// Constructing an Intl.DateTimeFormat is by far the most expensive part of a
// daynight() call, and every call needs the same two formatters ('UTC' and
// the requested zone). Cached by zone name, which is what makes bulk use
// (e.g. computing every timezone at once) practical.
const formatters = new Map<string, Intl.DateTimeFormat>()

const getFormatter = (timezone: string): Intl.DateTimeFormat => {
  let formatter = formatters.get(timezone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    formatters.set(timezone, formatter)
  }
  return formatter
}

const asUTCMillis = (date: Date, timezone: string): number => {
  const parts = getFormatter(timezone).formatToParts(date)
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

// IANA renames zones over time (Europe/Kiev -> Europe/Kyiv, Asia/Calcutta ->
// Asia/Kolkata, ...) and keeps the old names working as aliases. Which of the
// two spellings Intl hands back depends on the ICU version bundled with the
// runtime, so a table built from one spelling will miss real users on
// runtimes that prefer the other -- for them daynight() used to throw.
//
// Rather than shipping (and having to maintain) an alias table, canonicalise
// both sides through Intl itself: whichever spelling this runtime prefers, a
// name and its alias collapse onto the same string. The index is built only
// when a direct lookup misses, so the common path stays free.
let canonicalIndex: Map<string, string> | undefined

const canonical = (timezone: string): string | undefined => {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: timezone }).resolvedOptions().timeZone
  } catch {
    return undefined
  }
}

const getCanonicalIndex = (): Map<string, string> => {
  if (!canonicalIndex) {
    canonicalIndex = new Map()
    const walk = (region: TimeZoneRegion, path: string[]) => {
      for (const key of Object.keys(region)) {
        const value = region[key]
        const name = [...path, key]
        if (Array.isArray(value)) {
          const key = canonical(name.join('/'))
          if (key) canonicalIndex!.set(key, name.join('/'))
        } else {
          walk(value as TimeZoneRegion, name)
        }
      }
    }
    walk(timezones as TimeZoneRegion, [])
  }
  return canonicalIndex
}

// Returns the name to look coordinates up by, or undefined when the zone is
// unknown even after alias resolution.
const resolveTimeZone = (timezone: string): string | undefined => {
  if (getTimeZoneCoordinates(timezone)) return timezone

  const key = canonical(timezone)
  if (!key) return undefined

  const resolved = getCanonicalIndex().get(key)
  return resolved && getTimeZoneCoordinates(resolved) ? resolved : undefined
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
