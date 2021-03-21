import { timeZoneCoordinates } from './timeZoneCoordinates'
import sun from './sun'

export type Daynight = (options?: DaynightOptions) => DaynightSuccess | DaynightError
export interface DaynightOptions {
  timeZone?: string
  date?: Date
}
export interface DaynightError {
  error: Error
}
export interface DaynightSuccess {
  timezone: string
  coordinates: [number, number]
  error: null
  light: boolean
  dark: boolean
  sunset: Date
  sunrise: Date
}

const daynight: Daynight = config => {
  try {
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
    const dark = options.date < sunrise || options.date > sunset
    const light = !dark

    return {
      error: null,
      timezone: options.timeZone,
      coordinates,
      light,
      dark,
      sunrise,
      sunset,
    }
  } catch (error) {
    return { error }
  }
}

const getTimeZoneName = () => Intl.DateTimeFormat().resolvedOptions().timeZone
const getDefaultOptions = (): Required<DaynightOptions> => ({
  timeZone: getTimeZoneName(),
  date: new Date(),
})
const getTimeZoneCoordinates = (timeZone: string): [number, number] | undefined =>
  timeZoneCoordinates[timeZone]

export default daynight
