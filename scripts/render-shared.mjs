// The pieces shared by the two image generators -- generate-og.mjs, which
// renders the flat social card, and generate-hero.mjs, which renders the
// spinning globe for the README.
//
// Both draw the same world from the same three inputs the demo page uses: the
// generated land outline, the generated zone list, and daynight() itself. The
// point of this file is that they cannot drift apart -- one palette, one solar
// model, one copy of the land parser. Neither generator reimplements any of it.
import fs from 'fs'

export const DEG = Math.PI / 180

// The demo's map palette. Changing a colour here changes both images.
export const SEA = [214, 222, 229]
export const LAND = [176, 184, 175]
export const NIGHT = [4, 8, 20]
export const DOT_DAY = [255, 198, 92]
export const DOT_NIGHT = [47, 61, 92]

/**
 * Where the sun is directly overhead at `date`, in degrees.
 *
 * Low-precision almanac formulae: good to about a hundredth of a degree over
 * the years either side of now, which is far finer than a pixel at any size
 * these images are drawn at.
 */
export const subsolarPoint = date => {
  const days = date.getTime() / 86400000 - 10957.5
  const meanLongitude = (280.46 + 0.9856474 * days) * DEG
  const meanAnomaly = (357.528 + 0.9856003 * days) * DEG
  const eclipticLongitude =
    meanLongitude + (1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * DEG
  const obliquity = (23.439 - 0.0000004 * days) * DEG
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude))
  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude),
  )
  const gmst = 280.46061837 + 360.98564736629 * days
  return {
    lon: ((((rightAscension / DEG - gmst) % 360) + 540) % 360) - 180,
    lat: declination / DEG,
  }
}

/** Sine of the sun's altitude at a point. Negative means below the horizon. */
export const sunAltitudeSin = (lon, lat, sun) =>
  Math.sin(lat * DEG) * Math.sin(sun.lat * DEG) +
  Math.cos(lat * DEG) * Math.cos(sun.lat * DEG) * Math.cos((lon - sun.lon) * DEG)

/** Sine of the altitude at the bottom of astronomical twilight. */
export const TWILIGHT_BOTTOM = Math.sin(-18 * DEG)

/**
 * How dark a point is, 0 in full day to 1 past astronomical twilight. The
 * same ramp map/globe.ts uses in the browser.
 */
export const darknessAt = (lon, lat, sun) => {
  const altitude = sunAltitudeSin(lon, lat, sun)
  return altitude >= 0 ? 0 : altitude <= TWILIGHT_BOTTOM ? 1 : altitude / TWILIGHT_BOTTOM
}

export const blend = (from, to, amount) => from.map((v, i) => Math.round(v + (to[i] - v) * amount))

/**
 * The land outline as closed rings of [x, y] in VIEW units, parsed out of the
 * generated demo/src/map/land.ts. The path is the same one the page renders.
 */
export const landRings = () => {
  const source = fs.readFileSync('demo/src/map/land.ts', 'utf-8')
  const path = source.match(/LAND_PATH =\s*'([^']*)'/)[1]

  const rings = []
  let ring = null
  let x = 0
  let y = 0
  const command = /([MlZ])(-?\d+)? ?(-?\d+)?/g
  let match
  while ((match = command.exec(path))) {
    if (match[1] === 'M') {
      ring = []
      rings.push(ring)
      x = Number(match[2])
      y = Number(match[3])
      ring.push([x, y])
    } else if (match[1] === 'l') {
      x += Number(match[2])
      y += Number(match[3])
      ring.push([x, y])
    }
  }
  return rings
}

/** Every timezone name the demo plots, read from the generated zone list. */
export const zoneNames = () => {
  const source = fs.readFileSync('demo/src/map/zones.ts', 'utf-8')
  return [...source.matchAll(/'([A-Za-z_]+(?:\/[A-Za-z_+-]+)+)'/g)].map(m => m[1])
}
