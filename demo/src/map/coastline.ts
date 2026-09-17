// The land outline, turned from the generated SVG path into plain lon/lat
// rings the globe can project every frame.
//
// land.ts is written against the equirectangular projection, where a straight
// segment is a straight line on the map. On a sphere a long segment is an arc,
// so anything spanning more than a few degrees is split up here -- otherwise
// Antarctica's baseline, which runs the full width of the world in two hops,
// crosses the globe as a chord instead of hugging the pole.
import { LAND_PATH, LAND_VIEW } from './land'

export type Ring = Float64Array

/** The longest segment left unsplit, in degrees. */
const MAX_STEP = 4

const toLon = (x: number) => x / (LAND_VIEW.width / 360) - 180
const toLat = (y: number) => 90 - y / (LAND_VIEW.height / 180)

export const COASTLINE: Ring[] = parse(LAND_PATH)

function parse(path: string): Ring[] {
  const rings: Ring[] = []
  let points: number[] = []
  let x = 0
  let y = 0

  // The generator only ever emits M (absolute move), l (relative line) and Z,
  // so this stays a two-case reader rather than a full SVG path parser.
  const tokens = path.match(/[MlZ]|-?\d+(?:\.\d+)?/g) ?? []
  let command = ''

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (token === 'Z') {
      if (points.length) rings.push(Float64Array.from(points))
      points = []
      continue
    }

    if (token === 'M' || token === 'l') {
      command = token
      continue
    }

    const first = Number(token)
    const second = Number(tokens[++i])

    if (command === 'M') {
      if (points.length) rings.push(Float64Array.from(points))
      points = []
      x = first
      y = second
      points.push(toLon(x), toLat(y))
      continue
    }

    const fromLon = toLon(x)
    const fromLat = toLat(y)
    x += first
    y += second
    pushSegment(points, fromLon, fromLat, toLon(x), toLat(y))
  }

  if (points.length) rings.push(Float64Array.from(points))

  return rings
}

function pushSegment(points: number[], lon0: number, lat0: number, lon1: number, lat1: number) {
  const steps = Math.ceil(Math.max(Math.abs(lon1 - lon0), Math.abs(lat1 - lat0)) / MAX_STEP)

  for (let step = 1; step <= steps; step++) {
    const t = step / steps
    points.push(lon0 + (lon1 - lon0) * t, lat0 + (lat1 - lat0) * t)
  }
}
