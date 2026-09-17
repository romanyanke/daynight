// The globe view: the canvas planet from globe.ts, the dots over it, and the
// drag that spins it.
import { createGlobe } from './globe'
import { createDots, DotsLayer } from './dots'
import { createSpin, Spin } from './spin'
import { ZoneState } from './zone-state'
import { projector } from './projection'

/**
 * The dots' SVG is a square with the globe inscribed in it, and it is as tall
 * as the flat map's viewBox on purpose: both views fill the same box height,
 * so equal units mean one set of dot sizes in CSS covers both.
 */
const VIEW = 1800
const RADIUS = VIEW / 2 - 1

export interface WorldView {
  element: HTMLElement
  dots: DotsLayer
  /** How the view introduces itself once it is in front. */
  frontRole: { role: string; label: string }
  /** What the thumbnail's button says. */
  pipLabel: string
  name: string
  /** Redraws everything this view shows for `date`. */
  render(date: Date): void
  /** Asks for a redraw on the next frame. */
  invalidate(): void
  /** Re-reads the theme colours a canvas cannot inherit. */
  refreshColours(): void
  /** Turns the view, if it can turn, to put a place in the middle. */
  focus(lon: number, lat: number): void
}

export const createGlobeView = (state: ZoneState, prefersReducedMotion: boolean): WorldView => {
  const element = document.createElement('div')
  element.className = 'map map--globe'

  const globe = createGlobe()
  element.append(globe.element)

  // Bound to whatever rotation the spin is at when a dot is placed, so the
  // dots cannot lag a frame behind the land under them.
  let project = projector({ lon: 0, lat: 0 })
  const position = new Float64Array(3)

  const dots = createDots(state, { width: VIEW, height: VIEW }, (zone, out) => {
    project(zone.lon, zone.lat, position)
    if (position[2] <= 0) return false

    out[0] = VIEW / 2 + position[0] * RADIUS
    // Screen y grows downwards; the projection hands back maths-y.
    out[1] = VIEW / 2 - position[1] * RADIUS
    return true
  })

  element.append(dots.element)

  let date = new Date()
  let frame = 0
  let spin: Spin

  const render = (next?: Date) => {
    frame = 0
    if (next) date = next

    globe.draw(date, spin.rotation)
    project = projector(spin.rotation)
    dots.place()
  }

  const invalidate = () => {
    if (!frame) frame = requestAnimationFrame(() => render())
  }

  spin = createSpin(element, invalidate, prefersReducedMotion)

  // The canvas is sized from its box, and the box follows the page width.
  new ResizeObserver(invalidate).observe(element)

  return {
    element,
    dots,
    name: 'globe',
    frontRole: {
      role: 'application',
      label: 'Globe of every timezone. Drag, or use the arrow keys, to spin it.',
    },
    pipLabel: 'Show the globe',
    render,
    invalidate,
    refreshColours: globe.refreshColours,
    focus: (lon, lat) => spin.glideTo(lon, lat),
  }
}
