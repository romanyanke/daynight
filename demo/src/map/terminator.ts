import { VIEW } from './projection'
import { subsolarPoint } from './sun-position'

// The night side, drawn as a soft gradient rather than a hard curve.
//
// Shading a coarse grid and letting the browser scale it up costs one small
// ImageData per frame and gives the twilight band for free -- far cheaper
// than tracing the terminator as a path, and it degrades gracefully at any
// map size.
const GRID_WIDTH = 180
const GRID_HEIGHT = 90

// Civil through astronomical twilight, as the sine of the sun's altitude.
// The sky does not switch from lit to black at the horizon.
const TWILIGHT_TOP = Math.sin(0)
const TWILIGHT_BOTTOM = Math.sin((-18 * Math.PI) / 180)

export interface TerminatorLayer {
  element: HTMLCanvasElement
  draw(date: Date): void
}

export const createTerminator = (): TerminatorLayer => {
  const element = document.createElement('canvas')
  element.className = 'map__terminator'
  element.width = GRID_WIDTH
  element.height = GRID_HEIGHT
  element.setAttribute('aria-hidden', 'true')

  const context = element.getContext('2d')!
  const image = context.createImageData(GRID_WIDTH, GRID_HEIGHT)

  // The sine of the sun's altitude is sin(lat)sin(dec) + cos(lat)cos(dec)cos(Δlon):
  // the only thing varying along a row is the last cosine, and the only thing
  // varying down a column is the latitude. Both are worked out once per frame
  // here, which leaves the inner loop two multiplies deep instead of four
  // trigonometric calls -- the difference between a few milliseconds and a
  // fraction of one, every time the slider moves.
  const sinLat = new Float64Array(GRID_HEIGHT)
  const cosLat = new Float64Array(GRID_HEIGHT)
  const lonOffset = new Float64Array(GRID_WIDTH)

  for (let row = 0; row < GRID_HEIGHT; row++) {
    const lat =
      ((VIEW.latMax - ((row + 0.5) / GRID_HEIGHT) * (VIEW.latMax - VIEW.latMin)) * Math.PI) / 180
    sinLat[row] = Math.sin(lat)
    cosLat[row] = Math.cos(lat)
  }

  for (let column = 0; column < GRID_WIDTH; column++) {
    lonOffset[column] =
      ((VIEW.lonMin + ((column + 0.5) / GRID_WIDTH) * (VIEW.lonMax - VIEW.lonMin)) * Math.PI) / 180
  }

  const cosDeltaLon = new Float64Array(GRID_WIDTH)

  const draw = (date: Date) => {
    const sun = subsolarPoint(date)
    const { data } = image

    const sunLon = (sun.lon * Math.PI) / 180
    const sinDeclination = Math.sin((sun.lat * Math.PI) / 180)
    const cosDeclination = Math.cos((sun.lat * Math.PI) / 180)

    for (let column = 0; column < GRID_WIDTH; column++) {
      cosDeltaLon[column] = Math.cos(lonOffset[column] - sunLon)
    }

    for (let row = 0; row < GRID_HEIGHT; row++) {
      const flat = sinLat[row] * sinDeclination
      const swing = cosLat[row] * cosDeclination

      for (let column = 0; column < GRID_WIDTH; column++) {
        const altitude = flat + swing * cosDeltaLon[column]

        // 0 in full daylight, 1 in full night, ramped across twilight.
        const darkness =
          altitude >= TWILIGHT_TOP
            ? 0
            : altitude <= TWILIGHT_BOTTOM
              ? 1
              : (TWILIGHT_TOP - altitude) / (TWILIGHT_TOP - TWILIGHT_BOTTOM)

        const offset = (row * GRID_WIDTH + column) * 4
        data[offset] = 4
        data[offset + 1] = 8
        data[offset + 2] = 20
        data[offset + 3] = Math.round(darkness * 200)
      }
    }

    context.putImageData(image, 0, 0)
  }

  return { element, draw }
}
