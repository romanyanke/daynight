type GetBrightness = ([sunrise, sunset]: [Date, Date]) => (currentDate: Date) => number
type GetProgress = (payload: {
  cycle: number
  start: number
  end: number
}) => (value: number) => number

export const getProgress: GetProgress =
  ({ cycle, start, end }) =>
  value => {
    const light = Math.abs(start - end)
    const lightMid = light / 2
    const lightPeek = start + lightMid
    const dark = cycle - light
    const darkMid = dark / 2
    const darkPeek = end + darkMid
    const prevCycleDarkEnd = end - cycle

    const getRest = (from: number, to: number) =>
      (value - Math.min(from, to)) / Math.abs(from - to) / 2

    if (start <= value && value < lightPeek) {
      return 0.5 + getRest(start, lightPeek)
    }
    if (lightPeek <= value && value < end) {
      return 1 - getRest(lightPeek, end)
    }
    if (end <= value && value < darkPeek) {
      return 0.5 - getRest(end, darkPeek)
    }
    if (prevCycleDarkEnd <= value && value < start) {
      return getRest(prevCycleDarkEnd, start)
    }

    return 0
  }

export const getBrightness: GetBrightness = ([sunrise, sunset]) => {
  const HOUR = 1000 * 60 * 60
  const DAY = 24 * HOUR
  const brightness = getProgress({ cycle: DAY, start: sunrise.valueOf(), end: sunset.valueOf() })

  return date => brightness(date.valueOf())
}
