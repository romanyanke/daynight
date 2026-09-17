import daynight, { DaynightResult } from 'daynight'
import { Rotation, projector } from './projection'
import { ZONES } from './zones'

// One dot per timezone, coloured by the brightness daynight() reports for it.
//
// SVG rather than canvas: 418 circles is nowhere near enough to trouble a
// browser, and hover, keyboard focus and accessible names come for free --
// on a canvas every one of those would have to be rebuilt by hand. The globe
// underneath is canvas for the opposite reason (see globe.ts).

/** The SVG viewBox is a square with the globe inscribed in it. */
export const DOT_VIEW = 1000

/** A hair inside the rim, matching the canvas. */
const DOT_RADIUS = DOT_VIEW / 2 - 1

export interface Dot {
  timezone: string
  circle: SVGCircleElement
  result: DaynightResult
  lon: number
  lat: number
  /** True while the zone is on the half of the globe facing the viewer. */
  visible: boolean
}

export interface DotsLayer {
  element: SVGSVGElement
  dots: Dot[]
  /** Recomputes every zone for `date`. Returns how long that took, in ms. */
  draw(date: Date): number
  /** Moves every dot to where `rotation` puts it, hiding the far side. */
  place(rotation: Rotation): void
}

// Quantising brightness means a dot's fill is only rewritten when it actually
// changes shade, so dragging the slider touches the dots near the terminator
// instead of all of them.
const SHADES = 24

const shadeOf = (result: DaynightResult) => Math.round(result.brightness * (SHADES - 1))

export const createDots = (): DotsLayer => {
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  element.setAttribute('viewBox', `0 0 ${DOT_VIEW} ${DOT_VIEW}`)
  element.setAttribute('class', 'map__dots')
  element.setAttribute('role', 'list')
  element.setAttribute('aria-label', 'Timezones')

  const dots: Dot[] = []
  const shades = new Map<string, number>()

  for (const timezone of ZONES) {
    let result: DaynightResult
    try {
      result = daynight({ timezone })
    } catch {
      // A zone the table cannot place. Nothing to draw, and nothing worth
      // interrupting the page for.
      continue
    }

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('r', '6')
    circle.setAttribute('class', 'map__dot')
    circle.dataset.timezone = timezone
    circle.setAttribute('tabindex', '0')
    circle.setAttribute('role', 'listitem')

    element.append(circle)
    dots.push({
      timezone,
      circle,
      result,
      lon: result.coordinates[0],
      lat: result.coordinates[1],
      visible: true,
    })
  }

  const point = new Float64Array(3)

  const place = (rotation: Rotation) => {
    const project = projector(rotation)

    for (const dot of dots) {
      project(dot.lon, dot.lat, point)

      // The far side of a solid planet is behind it. Hidden rather than moved
      // off-screen, so a dot there cannot be hovered or tabbed into either.
      const visible = point[2] > 0
      if (visible !== dot.visible) {
        dot.visible = visible
        dot.circle.style.display = visible ? '' : 'none'
        // Also out of the tab order, not merely invisible.
        if (visible) {
          dot.circle.setAttribute('tabindex', '0')
        } else {
          dot.circle.removeAttribute('tabindex')
        }
      }

      if (!visible) continue

      circlePosition(dot.circle, point)
    }
  }

  const draw = (date: Date): number => {
    const started = performance.now()

    for (const dot of dots) {
      const result = daynight({ timezone: dot.timezone, date })
      dot.result = result

      const shade = shadeOf(result)
      if (shades.get(dot.timezone) !== shade) {
        shades.set(dot.timezone, shade)
        dot.circle.style.setProperty('--brightness', String(shade / (SHADES - 1)))
        // Polar zones get their own marker: during the midnight sun or the
        // polar night there is no sunrise to be near, and a plain bright or
        // dark dot would hide that.
        dot.circle.classList.toggle('map__dot--polar', result.polar !== null)
      }
    }

    return performance.now() - started
  }

  return { element, dots, draw, place }
}

const circlePosition = (circle: SVGCircleElement, point: Float64Array) => {
  circle.setAttribute('cx', (DOT_VIEW / 2 + point[0] * DOT_RADIUS).toFixed(1))
  // Screen y grows downwards; the projection hands back maths-y.
  circle.setAttribute('cy', (DOT_VIEW / 2 - point[1] * DOT_RADIUS).toFixed(1))
}
