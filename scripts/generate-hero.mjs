// Renders assets/hero.gif, the animated globe at the top of the README.
//
// GitHub strips <script>, <canvas> and <iframe> out of markdown, so the real
// demo cannot be embedded. The next best thing is the demo's own globe,
// actually spinning: over one loop the planet turns once while two days pass,
// so the terminator sweeps across the land and all 418 dots go from night blue
// to day gold and back.
//
// Every frame is a real pass of the library -- one daynight() call per zone,
// per frame, the same call the page makes -- rendered from the same land
// outline and zone list. Nothing here is an illustration of the output; it is
// the output. Palette, solar model and land parsing are shared with the social
// card in render-shared.mjs.
//
// Written without an image library, like generate-og.mjs: a GIF of flat
// colours is a palette, a LZW coder and a few headers, and this repository
// ships no runtime dependencies.
import fs from 'fs'
import { createRequire } from 'module'
import { VIEW } from '../demo/src/map/projection.ts'
import {
  DEG,
  SEA,
  LAND,
  NIGHT,
  DOT_DAY,
  DOT_NIGHT,
  subsolarPoint,
  TWILIGHT_BOTTOM,
  blend,
  landRings,
  zoneNames,
} from './render-shared.mjs'

const require = createRequire(import.meta.url)
const daynight = require('../dist/cjs/index.js').default

const TARGET = 'assets/hero.gif'

const SIZE = 460
const RADIUS = SIZE / 2 - 4

// 2x2 samples per pixel. Enough to keep coastlines and the limb from reading
// as staircases, cheap enough that the whole animation renders in seconds.
const SS = 2

// The point facing the viewer. Tilted north because most of the world's land,
// and so most of the dots, is up there.
const VIEW_LAT = 22

// 48 frames at 70ms is a 3.4s loop. The globe turns once and the clock runs
// two days, so the terminator makes one full pass over the ground.
const FRAMES = 40
const DELAY = 7
const SPIN = 360
const HOURS = 48

// Starting moment. The solstice, deliberately: the sun's declination is at its
// extreme there, so it barely moves over the two days the loop covers and the
// last frame lines up with the first. Any other date leaves a visible jump.
const START = new Date('2026-06-21T09:30:00Z')
const START_LON = -30

// Quantisation. The GIF has 256 slots, so every colour the renderer can
// produce is rounded onto a grid before it is interned: land coverage from the
// 2x2 samples, darkness across the twilight ramp, and dot brightness. The
// counts below come to well under the limit, which is asserted after the fact.
const LAND_STEPS = SS * SS
const DARK_STEPS = 24
const DOT_STEPS = 18

const NIGHT_MIX = 0.78

// A rim, matching the stroke the page draws around its globe, so the planet
// keeps an outline instead of fading into the page. Two colours, because a
// light rim over the night side looks like a scratch.
const RIM_FROM = 0.993
const RIM_DAY = [176, 170, 170]
const RIM_NIGHT = [30, 38, 56]

// ---------------------------------------------------------------- land mask

// The land outline, rasterised once into an equirectangular grid at the
// viewBox's own resolution. The globe then samples this grid instead of
// re-testing every polygon for every pixel of every frame.
const MASK_W = VIEW.width
const MASK_H = VIEW.height
const mask = new Uint8Array(MASK_W * MASK_H)

{
  const rings = landRings()
  for (let y = 0; y < MASK_H; y++) {
    const crossings = []
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const [x1, y1] = ring[i]
        const [x2, y2] = ring[(i + 1) % ring.length]
        if (y1 === y2) continue
        if (y >= Math.min(y1, y2) && y < Math.max(y1, y2))
          crossings.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1))
      }
    }
    crossings.sort((a, b) => a - b)
    for (let i = 0; i + 1 < crossings.length; i += 2)
      for (
        let x = Math.max(0, Math.ceil(crossings[i]));
        x < Math.min(MASK_W, crossings[i + 1]);
        x++
      )
        mask[y * MASK_W + x] = 1
  }
}

// ------------------------------------------------------- sample precomputing

// Inverse orthographic, once. The viewer's latitude never changes and the
// spin only shifts longitude, so a sample's latitude -- and the offset from
// the facing longitude to its own -- are the same in every frame. Only the
// longitude the sample ends up at moves, and that is one addition.
const SAMPLES = SIZE * SS
const total = SAMPLES * SAMPLES

const inside = new Uint8Array(total)
const sampleLonOffset = new Float32Array(total)
const sampleLatSin = new Float32Array(total)
const sampleLatCos = new Float32Array(total)
const sampleMaskRow = new Int32Array(total)
const sampleRim = new Uint8Array(total)

{
  const phi0 = VIEW_LAT * DEG
  const sin0 = Math.sin(phi0)
  const cos0 = Math.cos(phi0)

  for (let sy = 0; sy < SAMPLES; sy++) {
    // Screen y grows downward, the projection's y grows upward.
    const ny = (SIZE / 2 - (sy + 0.5) / SS) / RADIUS
    for (let sx = 0; sx < SAMPLES; sx++) {
      const index = sy * SAMPLES + sx
      const nx = ((sx + 0.5) / SS - SIZE / 2) / RADIUS
      const rho = Math.hypot(nx, ny)
      if (rho > 1) continue

      inside[index] = 1
      if (rho >= RIM_FROM) sampleRim[index] = 1

      const c = Math.asin(rho)
      const sinC = Math.sin(c)
      const cosC = Math.cos(c)
      // At the exact centre rho is 0 and the general formula divides by it;
      // that point is simply the one the viewer faces.
      const lat = rho === 0 ? VIEW_LAT : Math.asin(cosC * sin0 + (ny * sinC * cos0) / rho) / DEG
      const lonOffset =
        rho === 0 ? 0 : Math.atan2(nx * sinC, rho * cosC * cos0 - ny * sinC * sin0) / DEG

      sampleLonOffset[index] = lonOffset
      sampleLatSin[index] = Math.sin(lat * DEG)
      sampleLatCos[index] = Math.cos(lat * DEG)

      const row = Math.min(
        MASK_H - 1,
        Math.max(0, Math.floor(((VIEW.latMax - lat) / (VIEW.latMax - VIEW.latMin)) * MASK_H)),
      )
      sampleMaskRow[index] = row * MASK_W
    }
  }
}

// ------------------------------------------------------------------ palette

// Colours are interned as they are produced. Index 0 is reserved for the
// transparent background, so the hero sits on GitHub's light and dark themes
// alike without carrying a page colour of its own.
const palette = [[0, 0, 0]]
const paletteIndex = new Map()
const intern = colour => {
  const key = (colour[0] << 16) | (colour[1] << 8) | colour[2]
  const existing = paletteIndex.get(key)
  if (existing !== undefined) return existing
  const index = palette.length
  palette.push(colour)
  paletteIndex.set(key, index)
  return index
}

// The surface: every land-coverage and darkness pairing the renderer can
// reach, built up front so a frame is a lookup rather than an arithmetic.
const surface = []
for (let land = 0; land <= LAND_STEPS; land++) {
  const base = blend(SEA, LAND, land / LAND_STEPS)
  const row = []
  for (let dark = 0; dark <= DARK_STEPS; dark++)
    row.push(intern(blend(base, NIGHT, (dark / DARK_STEPS) * NIGHT_MIX)))
  surface.push(row)
}

const dotColours = []
for (let step = 0; step <= DOT_STEPS; step++)
  dotColours.push(intern(blend(DOT_NIGHT, DOT_DAY, step / DOT_STEPS)))

const rimDay = intern(RIM_DAY)
const rimNight = intern(RIM_NIGHT)

if (palette.length > 256)
  throw new Error(`palette overflowed: ${palette.length} colours, the GIF format allows 256`)

// -------------------------------------------------------------------- frames

const zones = zoneNames()

/** Forward orthographic for a single point. Dots only; the surface is inverse. */
const projectDot = (lon, lat, rotationLon) => {
  const phi = lat * DEG
  const lambda = (lon - rotationLon) * DEG
  const phi0 = VIEW_LAT * DEG
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)
  const cosLambda = Math.cos(lambda)
  return [
    cosPhi * Math.sin(lambda),
    Math.cos(phi0) * sinPhi - Math.sin(phi0) * cosPhi * cosLambda,
    Math.sin(phi0) * sinPhi + Math.cos(phi0) * cosPhi * cosLambda,
  ]
}

const renderFrame = frame => {
  const progress = frame / FRAMES
  const rotationLon = START_LON + SPIN * progress
  const moment = new Date(START.getTime() + HOURS * 3600000 * progress)
  const sun = subsolarPoint(moment)

  const sunLatSin = Math.sin(sun.lat * DEG)
  const sunLatCos = Math.cos(sun.lat * DEG)

  const pixels = new Uint8Array(SIZE * SIZE)

  // Surface. Each pixel averages its 2x2 samples: the land fraction gives the
  // coastline its soft edge, the darkness the terminator's.
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let covered = 0
      let landHits = 0
      let darkness = 0
      let rimHits = 0

      for (let oy = 0; oy < SS; oy++) {
        const rowBase = (y * SS + oy) * SAMPLES + x * SS
        for (let ox = 0; ox < SS; ox++) {
          const index = rowBase + ox
          if (!inside[index]) continue
          covered++
          if (sampleRim[index]) rimHits++

          const lon = sampleLonOffset[index] + rotationLon
          // Inlined from darknessAt: the sample's own sine and cosine were
          // computed once, so only the hour angle is left to work out here.
          const altitude =
            sampleLatSin[index] * sunLatSin +
            sampleLatCos[index] * sunLatCos * Math.cos((lon - sun.lon) * DEG)
          darkness +=
            altitude >= 0 ? 0 : altitude <= TWILIGHT_BOTTOM ? 1 : altitude / TWILIGHT_BOTTOM

          let column = Math.floor(((lon - VIEW.lonMin) / 360) * MASK_W) % MASK_W
          if (column < 0) column += MASK_W
          landHits += mask[sampleMaskRow[index] + column]
        }
      }

      // Under half covered is outside the planet: left transparent.
      if (covered * 2 < SS * SS) continue

      const dark = darkness / covered
      if (rimHits * 2 >= covered) {
        pixels[y * SIZE + x] = dark > 0.5 ? rimNight : rimDay
        continue
      }
      pixels[y * SIZE + x] =
        surface[Math.round((landHits / covered) * LAND_STEPS)][Math.round(dark * DARK_STEPS)]
    }
  }

  // One dot per zone, from a real call, exactly as the demo page plots them.
  let plotted = 0
  for (const timezone of zones) {
    let result
    try {
      result = daynight({ timezone, date: moment })
    } catch {
      continue
    }
    plotted++
    const [nx, ny, nz] = projectDot(result.coordinates[0], result.coordinates[1], rotationLon)
    if (nz <= 0) continue // the far side of the planet

    const cx = Math.round(SIZE / 2 + nx * RADIUS)
    const cy = Math.round(SIZE / 2 - ny * RADIUS)
    const colour = dotColours[Math.round(result.brightness * DOT_STEPS)]

    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dy * dy > 5.2) continue
        const x = cx + dx
        const y = cy + dy
        if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) continue
        // Never outside the disc: a dot at the limb would otherwise leave
        // specks floating off the edge of the planet.
        if (!pixels[y * SIZE + x]) continue
        pixels[y * SIZE + x] = colour
      }
    }
  }

  return { pixels, plotted }
}

// ------------------------------------------------------------- GIF encoding

/** LSB-first bit packer that emits GIF's 255-byte sub-blocks. */
const bitWriter = () => {
  const blocks = []
  let current = []
  let bits = 0
  let width = 0

  const pushByte = byte => {
    current.push(byte)
    if (current.length === 255) {
      blocks.push(Buffer.from([255, ...current]))
      current = []
    }
  }

  return {
    write(code, size) {
      bits |= code << width
      width += size
      while (width >= 8) {
        pushByte(bits & 0xff)
        bits >>= 8
        width -= 8
      }
    },
    finish() {
      if (width > 0) pushByte(bits & 0xff)
      if (current.length) blocks.push(Buffer.from([current.length, ...current]))
      blocks.push(Buffer.from([0])) // block terminator
      return Buffer.concat(blocks)
    },
  }
}

/**
 * GIF's variable-width LZW. The dictionary starts as the palette itself and
 * grows by one entry per emitted code; the code width follows it up, and the
 * whole thing restarts if it ever fills.
 */
const lzw = (data, minCodeSize) => {
  const clearCode = 1 << minCodeSize
  const eoiCode = clearCode + 1
  const out = bitWriter()

  let dict = new Map()
  let next = clearCode + 2
  let width = minCodeSize + 1

  out.write(clearCode, width)

  let prefix = data[0]
  for (let i = 1; i < data.length; i++) {
    const k = data[i]
    const key = (prefix << 8) | k
    const found = dict.get(key)
    if (found !== undefined) {
      prefix = found
      continue
    }
    out.write(prefix, width)
    if (next === 4096) {
      out.write(clearCode, width)
      dict = new Map()
      next = clearCode + 2
      width = minCodeSize + 1
    } else {
      dict.set(key, next)
      next++
      // One past the power of two, not on it. A decoder only learns an entry
      // when it reads the code *after* the one that created it, so its table
      // trails this one by exactly a single entry -- widen in step with the
      // table here and every code from the boundary onwards is read at the
      // wrong width.
      if (next === (1 << width) + 1 && width < 12) width++
    }
    prefix = k
  }
  out.write(prefix, width)
  out.write(eoiCode, width)

  return out.finish()
}

const short = value => Buffer.from([value & 0xff, (value >> 8) & 0xff])

const colourTable = () => {
  const size = 256
  const table = Buffer.alloc(size * 3)
  for (let i = 0; i < palette.length; i++) {
    table[i * 3] = palette[i][0]
    table[i * 3 + 1] = palette[i][1]
    table[i * 3 + 2] = palette[i][2]
  }
  return table
}

const parts = [
  Buffer.from('GIF89a'),
  short(SIZE),
  short(SIZE),
  // Global colour table, 8 bits per colour, 256 entries.
  Buffer.from([0x80 | 0x70 | 7, 0, 0]),
  colourTable(),
  // Netscape extension: loop forever.
  Buffer.from([0x21, 0xff, 0x0b]),
  Buffer.from('NETSCAPE2.0'),
  Buffer.from([0x03, 0x01, 0x00, 0x00, 0x00]),
]

let calls = 0
for (let frame = 0; frame < FRAMES; frame++) {
  const { pixels, plotted } = renderFrame(frame)
  calls += plotted

  parts.push(
    // Graphic control: restore to background between frames, index 0 is
    // transparent.
    Buffer.from([0x21, 0xf9, 0x04, 0x09]),
    short(DELAY),
    Buffer.from([0x00, 0x00]),
    // Image descriptor: full frame, no local colour table.
    Buffer.from([0x2c]),
    short(0),
    short(0),
    short(SIZE),
    short(SIZE),
    Buffer.from([0x00, 8]),
    lzw(pixels, 8),
  )
}

parts.push(Buffer.from([0x3b])) // trailer

fs.mkdirSync('assets', { recursive: true })
fs.writeFileSync(TARGET, Buffer.concat(parts))

console.log(
  `Generated ${TARGET}: ${SIZE}x${SIZE}, ${FRAMES} frames, ${palette.length} colours, ` +
    `${calls} daynight() calls, ${(fs.statSync(TARGET).size / 1024).toFixed(0)} KB`,
)
