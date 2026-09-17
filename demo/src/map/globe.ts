// The globe itself: sea, coastline and night shading, all on one canvas.
//
// Canvas rather than SVG for these three, because every one of them is
// rewritten from scratch on each frame of a drag -- 1800-odd coastline
// vertices reprojected, and a shading mask recomputed -- and rebuilding that
// many SVG nodes per frame is exactly what a canvas is for. The dots stay in
// SVG (see dots.ts): they are few, and they need hover, focus and names.
import { COASTLINE } from './coastline'
import { Rotation, projector } from './projection'
import { subsolarPoint } from './sun-position'

// The night is shaded by sampling a coarse square and letting the browser
// smooth it up to size, the same trick the flat map used -- except that here
// the square is in screen space, so no reprojection is needed per pixel.
const MASK = 192

// Civil through astronomical twilight, as the sine of the sun's altitude.
const TWILIGHT_TOP = 0
const TWILIGHT_BOTTOM = Math.sin((-18 * Math.PI) / 180)

export interface GlobeLayer {
  element: HTMLCanvasElement
  /** Redraws sea, land and night for `date` as seen from `rotation`. */
  draw(date: Date, rotation: Rotation): void
  /** Re-reads the theme colours after a theme switch. */
  refreshColours(): void
}

export const createGlobe = (): GlobeLayer => {
  const element = document.createElement('canvas')
  element.className = 'map__globe'
  element.setAttribute('aria-hidden', 'true')

  const context = element.getContext('2d')!

  // The shading lives on its own small canvas and is stretched over the disc.
  const shadow = document.createElement('canvas')
  shadow.width = MASK
  shadow.height = MASK
  const shadowContext = shadow.getContext('2d')!
  const shadowImage = shadowContext.createImageData(MASK, MASK)

  let colours = readColours(element)

  const draw = (date: Date, rotation: Rotation) => {
    const ratio = window.devicePixelRatio || 1
    const size = element.clientWidth

    // Nothing to draw before the box has a size -- during a hidden tab, or
    // between mount and first layout. A zero-width canvas would ask for a
    // negative radius.
    if (size <= 0) return

    // Only touch the backing store when the box actually changed: assigning
    // width clears the canvas and reallocates it.
    if (element.width !== Math.round(size * ratio)) {
      element.width = Math.round(size * ratio)
      element.height = Math.round(size * ratio)
    }

    const px = element.width
    const radius = px / 2
    // A hair inside the edge, so the rim stroke is not clipped in half.
    const globe = radius - ratio

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, px, px)
    context.translate(radius, radius)

    // Sea first: the disc is the planet, and the coastline is drawn onto it.
    context.beginPath()
    context.arc(0, 0, globe, 0, Math.PI * 2)
    context.fillStyle = colours.sea
    context.fill()

    // Everything else stays inside the disc, which is what turns a coastline
    // running off the far side into a clean edge rather than a smear.
    context.save()
    context.clip()

    drawLand(context, globe, rotation, colours, ratio)
    drawNight(context, globe, date, rotation, shadow, shadowContext, shadowImage)

    context.restore()

    // The rim, over the top of the shading so the planet keeps its outline at
    // midnight.
    context.beginPath()
    context.arc(0, 0, globe, 0, Math.PI * 2)
    context.strokeStyle = colours.edge
    context.lineWidth = ratio
    context.stroke()
  }

  return {
    element,
    draw,
    refreshColours() {
      colours = readColours(element)
    },
  }
}

interface Colours {
  sea: string
  land: string
  landEdge: string
  edge: string
}

const readColours = (element: HTMLElement): Colours => {
  const style = getComputedStyle(element)

  return {
    sea: style.getPropertyValue('--map-sea').trim() || '#dfe5ea',
    land: style.getPropertyValue('--map-land').trim() || '#c3c9c2',
    landEdge: style.getPropertyValue('--map-land-edge').trim() || '#a8aea7',
    edge: style.getPropertyValue('--map-edge').trim() || '#c9c3c3',
  }
}

// Reused across rings and frames: this is the hot loop, and it runs a couple
// of thousand times per frame during a drag.
const point = new Float64Array(3)
const longestRing = COASTLINE.reduce((longest, ring) => Math.max(longest, ring.length), 0) / 2
// Screen x, screen y and the near/far sign, one entry per vertex.
const vx = new Float64Array(longestRing)
const vy = new Float64Array(longestRing)
const vz = new Float64Array(longestRing)

function drawLand(
  context: CanvasRenderingContext2D,
  globe: number,
  rotation: Rotation,
  colours: Colours,
  ratio: number,
) {
  const project = projector(rotation)

  context.beginPath()

  for (const ring of COASTLINE) {
    const count = ring.length / 2
    let visible = 0

    for (let i = 0; i < count; i++) {
      project(ring[i * 2], ring[i * 2 + 1], point)

      vx[i] = point[0] * globe
      // Screen y grows downwards; the projection hands back maths-y.
      vy[i] = -point[1] * globe
      vz[i] = point[2]
      if (point[2] > 0) visible++
    }

    // Nothing of this ring is facing us.
    if (visible === 0) continue

    if (visible === count) {
      context.moveTo(vx[0], vy[0])
      for (let i = 1; i < count; i++) context.lineTo(vx[i], vy[i])
      context.closePath()
      continue
    }

    clipRing(context, globe, count)
  }

  context.fillStyle = colours.land
  context.fill()
  context.strokeStyle = colours.landEdge
  context.lineWidth = ratio
  context.stroke()
}

// Which way the walk follows the rim. Every ring in land.ts is wound the same
// way -- all 92 come out with the same signed area -- and viewing a sphere
// from outside preserves that winding at any rotation, so one direction serves
// them all.
const RIM_ANTICLOCKWISE = false

const MAX_RUNS = 64
const runEntryAngle = new Float64Array(MAX_RUNS)
const runExitAngle = new Float64Array(MAX_RUNS)
const runEntryX = new Float64Array(MAX_RUNS)
const runEntryY = new Float64Array(MAX_RUNS)
const runExitX = new Float64Array(MAX_RUNS)
const runExitY = new Float64Array(MAX_RUNS)
const runFrom = new Int32Array(MAX_RUNS)
const runTo = new Int32Array(MAX_RUNS)
const runUsed = new Uint8Array(MAX_RUNS)

const TAU = Math.PI * 2

/** How far anticlockwise-on-screen `to` is from `from`, in 0..2π. */
const sweep = (from: number, to: number) => (((to - from) % TAU) + TAU) % TAU

/**
 * Draws the near-side parts of a ring that crosses the horizon, closing them
 * along the rim.
 *
 * The ring arrives as one or more visible runs, each starting where it came
 * over the horizon and ending where it went back behind it. Those runs are
 * stitched back together through the rim: from a run's exit, the walk follows
 * the rim to the *nearest* entry in one fixed direction, and carries on until
 * it arrives back where it started.
 *
 * Following the rim to the nearest entry is the part that matters. Joining
 * each exit to the next entry in the ring's own order instead -- which is what
 * two earlier attempts did -- sends the arc the wrong way round whenever a
 * coastline dips behind the horizon more than once, and a single arc taken the
 * long way round encloses the whole disc: with a non-zero fill the sea then
 * paints as land and the land as sea.
 */
function clipRing(context: CanvasRenderingContext2D, globe: number, count: number) {
  let runs = 0

  for (let i = 0; i < count && runs < MAX_RUNS; i++) {
    const previous = (i + count - 1) % count
    if (!(vz[i] > 0) || vz[previous] > 0) continue

    // A run starts here: walk it to wherever it goes back over the horizon.
    crossing(previous, i, globe)
    runEntryX[runs] = point[0]
    runEntryY[runs] = point[1]
    runEntryAngle[runs] = Math.atan2(point[1], point[0])
    runFrom[runs] = i

    let end = i
    while (vz[(end + 1) % count] > 0 && end - i < count) end++

    runTo[runs] = end
    crossing(end % count, (end + 1) % count, globe)
    runExitX[runs] = point[0]
    runExitY[runs] = point[1]
    runExitAngle[runs] = Math.atan2(point[1], point[0])
    runs++
  }

  if (runs === 0) return

  runUsed.fill(0, 0, runs)

  for (let first = 0; first < runs; first++) {
    if (runUsed[first]) continue

    context.moveTo(runEntryX[first], runEntryY[first])

    let current = first
    // Each polygon is closed by construction: following the rim always lands
    // on an entry, and there are finitely many runs.
    for (let guard = 0; guard <= runs; guard++) {
      runUsed[current] = 1

      for (let k = runFrom[current]; k <= runTo[current]; k++) {
        const index = k % count
        context.lineTo(vx[index], vy[index])
      }

      context.lineTo(runExitX[current], runExitY[current])

      const next = nearestEntry(runs, runExitAngle[current])
      context.arc(0, 0, globe, runExitAngle[current], runEntryAngle[next], RIM_ANTICLOCKWISE)

      if (next === first) break
      current = next
    }

    context.closePath()
  }
}

/** Which run's entry the rim reaches first, leaving `from` in the fixed direction. */
function nearestEntry(runs: number, from: number) {
  let best = 0
  let bestGap = Infinity

  for (let i = 0; i < runs; i++) {
    const gap = RIM_ANTICLOCKWISE ? sweep(runEntryAngle[i], from) : sweep(from, runEntryAngle[i])

    if (gap < bestGap) {
      bestGap = gap
      best = i
    }
  }

  return best
}

/**
 * Where the segment between two vertices crosses the horizon, written into
 * `point` as screen x and y.
 *
 * The crossing is where z reaches zero. Interpolating the screen positions
 * gives a point on the chord rather than the rim, a hair inside it, so it is
 * pushed back out -- otherwise the arc that follows would start with a small
 * jump outwards.
 */
function crossing(a: number, b: number, globe: number) {
  const t = vz[a] / (vz[a] - vz[b])
  const x = vx[a] + (vx[b] - vx[a]) * t
  const y = vy[a] + (vy[b] - vy[a]) * t
  const length = Math.hypot(x, y) || 1

  point[0] = (x / length) * globe
  point[1] = (y / length) * globe
}

function drawNight(
  context: CanvasRenderingContext2D,
  globe: number,
  date: Date,
  rotation: Rotation,
  shadow: HTMLCanvasElement,
  shadowContext: CanvasRenderingContext2D,
  image: ImageData,
) {
  const sun = subsolarPoint(date)
  // The sun as a direction in the same view space the globe is drawn in. With
  // that in hand the sine of the sun's altitude at a pixel is a dot product --
  // no trigonometry per pixel, which is what keeps a drag smooth.
  projector(rotation)(sun.lon, sun.lat, point)
  const sunX = point[0]
  const sunY = point[1]
  const sunZ = point[2]

  const { data } = image

  for (let row = 0; row < MASK; row++) {
    // Screen y, so the vertical axis is flipped back into maths-y here.
    const y = -(((row + 0.5) / MASK) * 2 - 1)

    for (let column = 0; column < MASK; column++) {
      const x = ((column + 0.5) / MASK) * 2 - 1
      const offset = (row * MASK + column) * 4

      const squared = x * x + y * y
      if (squared >= 1) {
        data[offset + 3] = 0
        continue
      }

      const altitude = sunX * x + sunY * y + sunZ * Math.sqrt(1 - squared)

      const darkness =
        altitude >= TWILIGHT_TOP
          ? 0
          : altitude <= TWILIGHT_BOTTOM
            ? 1
            : (TWILIGHT_TOP - altitude) / (TWILIGHT_TOP - TWILIGHT_BOTTOM)

      data[offset] = 4
      data[offset + 1] = 8
      data[offset + 2] = 20
      data[offset + 3] = Math.round(darkness * 200)
    }
  }

  shadowContext.putImageData(image, 0, 0)
  context.drawImage(shadow, -globe, -globe, globe * 2, globe * 2)
}
