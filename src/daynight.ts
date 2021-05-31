import { timeZoneCoordinates } from './timeZoneCoordinates'
import sun from './sun'
import { getBrightness } from './brightness'

export type Daynight = (options?: DaynightOptions) => DaynightResult
export interface DaynightOptions {
  timeZone?: string
  date?: Date
}

export interface DaynightResult {
  brightness: number
  timezone: string
  coordinates: [number, number]
  light: boolean
  dark: boolean
  sunset: Date
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

  return {
    coordinates,
    dark,
    light,
    brightness,
    sunrise,
    sunset,
    timezone: options.timeZone,
  }
}

const getDefaultOptions = (): Required<DaynightOptions> => ({
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  date: new Date(),
})
const getTimeZoneCoordinates = (timeZone: string): [number, number] | undefined =>
  timeZoneCoordinates[timeZone]

export default daynight
