// Renders demo/src/og.png, the image social networks show when the demo is
// linked. The page itself draws its map in the browser, which a preview
// crawler never runs, so the card needs a still.
//
// It is rendered from the same three inputs the page uses -- the generated
// land outline, the generated zone list, and daynight() itself -- so the
// picture in a tweet is the map, not an artist's impression of it. Written
// with zlib rather than an image library: a PNG of flat colours is a few
// dozen lines, and this repository ships no runtime dependencies.
import fs from 'fs'
import zlib from 'zlib'
import { createRequire } from 'module'
import { VIEW, project } from '../demo/src/map/projection.ts'

const require = createRequire(import.meta.url)
const daynight = require('../dist/cjs/index.js').default

const TARGET = 'demo/src/og.png'

// 2:1, matching the map's own aspect. Comfortably above the 600x315 that
// social cards ask for, and cropped only slightly at 1.91:1.
const WIDTH = 1200
const HEIGHT = 600

// A moment with the terminator across the middle of the frame rather than at
// an edge, so the card reads as a lit and an unlit half at a glance. Fixed,
// so the file only changes when the map really does.
const MOMENT = new Date('2026-06-21T09:30:00Z')

const SEA = [214, 222, 229]
const LAND = [176, 184, 175]
const NIGHT = [4, 8, 20]
const DOT_DAY = [255, 198, 92]
const DOT_NIGHT = [47, 61, 92]

const DEG = Math.PI / 180

const subsolarPoint = date => {
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

const sunAltitudeSin = (lon, lat, sun) =>
  Math.sin(lat * DEG) * Math.sin(sun.lat * DEG) +
  Math.cos(lat * DEG) * Math.cos(sun.lat * DEG) * Math.cos((lon - sun.lon) * DEG)

const pixels = Buffer.alloc(WIDTH * HEIGHT * 3)
const put = (x, y, colour) => {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return
  const offset = (y * WIDTH + x) * 3
  pixels[offset] = colour[0]
  pixels[offset + 1] = colour[1]
  pixels[offset + 2] = colour[2]
}
const at = (x, y) => {
  const offset = (y * WIDTH + x) * 3
  return [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
}
const blend = (from, to, amount) => from.map((v, i) => Math.round(v + (to[i] - v) * amount))

// Viewport units of the generated path scale straight to image pixels.
const scale = ([x, y]) => [(x / VIEW.width) * WIDTH, (y / VIEW.height) * HEIGHT]

for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) put(x, y, SEA)

// Land, filled by scanline from the same path the page renders.
const landSource = fs.readFileSync('demo/src/map/land.ts', 'utf-8')
const path = landSource.match(/LAND_PATH =\s*'([^']*)'/)[1]

const rings = []
{
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
}

for (let y = 0; y < HEIGHT; y++) {
  const crossings = []
  for (const ring of rings) {
    const points = ring.map(scale)
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i]
      const [x2, y2] = points[(i + 1) % points.length]
      if (y1 === y2) continue
      if (y >= Math.min(y1, y2) && y < Math.max(y1, y2))
        crossings.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1))
    }
  }
  crossings.sort((a, b) => a - b)
  for (let i = 0; i + 1 < crossings.length; i += 2)
    for (let x = Math.ceil(crossings[i]); x < crossings[i + 1]; x++) put(x, y, LAND)
}

// Night side, ramped across twilight exactly as terminator.ts does.
const sun = subsolarPoint(MOMENT)
const twilightBottom = Math.sin(-18 * DEG)
for (let y = 0; y < HEIGHT; y++) {
  const lat = VIEW.latMax - ((y + 0.5) / HEIGHT) * (VIEW.latMax - VIEW.latMin)
  for (let x = 0; x < WIDTH; x++) {
    const lon = VIEW.lonMin + ((x + 0.5) / WIDTH) * (VIEW.lonMax - VIEW.lonMin)
    const altitude = sunAltitudeSin(lon, lat, sun)
    const darkness = altitude >= 0 ? 0 : altitude <= twilightBottom ? 1 : altitude / twilightBottom
    if (darkness > 0) put(x, y, blend(at(x, y), NIGHT, darkness * 0.78))
  }
}

// One dot per zone, coloured by real brightness.
const zoneSource = fs.readFileSync('demo/src/map/zones.ts', 'utf-8')
const zones = [...zoneSource.matchAll(/'([A-Za-z_]+(?:\/[A-Za-z_+-]+)+)'/g)].map(m => m[1])

let plotted = 0
for (const timezone of zones) {
  let result
  try {
    result = daynight({ timezone, date: MOMENT })
  } catch {
    continue
  }
  plotted++
  const [x, y] = scale(project(result.coordinates[0], result.coordinates[1])).map(Math.round)
  const colour = blend(DOT_NIGHT, DOT_DAY, result.brightness)
  // <= 10.5 rather than 9: at this size the tighter circle leaves points
  // sticking out at the compass directions and the dots read as asterisks.
  for (let dy = -3; dy <= 3; dy++)
    for (let dx = -3; dx <= 3; dx++) if (dx * dx + dy * dy <= 10.5) put(x + dx, y + dy, colour)
}

// PNG: truecolour, one filterless scanline per row.
const raw = Buffer.alloc((WIDTH * 3 + 1) * HEIGHT)
for (let y = 0; y < HEIGHT; y++) {
  raw[y * (WIDTH * 3 + 1)] = 0
  pixels.copy(raw, y * (WIDTH * 3 + 1) + 1, y * WIDTH * 3, (y + 1) * WIDTH * 3)
}

const chunk = (type, data) => {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(zlib.crc32(body))
  return Buffer.concat([length, body, crc])
}

const header = Buffer.alloc(13)
header.writeUInt32BE(WIDTH, 0)
header.writeUInt32BE(HEIGHT, 4)
header[8] = 8 // bit depth
header[9] = 2 // truecolour

fs.writeFileSync(
  TARGET,
  Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]),
)

console.log(
  `Generated ${TARGET}: ${WIDTH}x${HEIGHT}, ${plotted} zones, ${(fs.statSync(TARGET).size / 1024).toFixed(0)} KB`,
)
