import tzCoordinates from './timeZoneCoordinates'
import sun3 from './sun'

export type Daynight = (fallback?: boolean, options?: DaynightOptions) => boolean
export interface DaynightOptions {
  timeZoneName?: string
  now?: Date
}

const daynight: Daynight = (fallback = true, config) => {
  try {
    const options = {
      ...getDefaultOptions(),
      ...config,
    }

    const coordinates = getTimeZoneCoordinates(options.timeZoneName)

    if (coordinates) {
      const { sunrise, sunset } = sun3(options.now, coordinates[0], coordinates[1]) // SunCalc.getTimes(options.now, coordinates[0], coordinates[1])

      // dark time
      if (options.now < sunrise || options.now > sunset) {
        return false
      }

      return true
    }

    throw new Error()
  } catch (e) {
    return fallback
  }
}

const getTimeZoneName = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone
const getDefaultOptions = (): Required<DaynightOptions> => ({
  timeZoneName: getTimeZoneName(),
  now: new Date(),
})
const getTimeZoneCoordinates = (timeZoneName: string): [number, number] | undefined =>
  tzCoordinates[timeZoneName]

export default daynight
