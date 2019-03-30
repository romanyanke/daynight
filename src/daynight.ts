import tzCoordinates from './timeZoneCoordinates'
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

    if (coordinates) {
      const { sunrise, sunset } = sun(options.date, coordinates[0], coordinates[1])

      const dark = options.date < sunrise || options.date > sunset
      const light = !dark

      return {
        error: null,
        timezone: options.timeZone,
        light,
        dark,
        sunrise,
        sunset,
      }
    }

    const errorMessage = `Timezone "${options.timeZone}" is not found`
    throw new Error(errorMessage)
  } catch (error) {
    return { error }
  }
}

const getTimeZoneName = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone
const getDefaultOptions = (): Required<DaynightOptions> => ({
  timeZone: getTimeZoneName(),
  date: new Date(),
})
const getTimeZoneCoordinates = (timeZone: string): [number, number] | undefined =>
  tzCoordinates[timeZone]

export default daynight
