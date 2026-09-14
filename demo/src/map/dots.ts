import daynight, { DaynightResult } from 'daynight'
import { VIEW, project } from './projection'
import { ZONES } from './zones'

// One dot per timezone, coloured by the brightness daynight() reports for it.
//
// SVG rather than canvas: 418 circles is nowhere near enough to trouble a
// browser, and hover, keyboard focus and accessible names come for free --
// on a canvas every one of those would have to be rebuilt by hand.

export interface Dot {
  timezone: string
  circle: SVGCircleElement
  result: DaynightResult
}

export interface DotsLayer {
  element: SVGSVGElement
  dots: Dot[]
  /** Recomputes every zone for `date`. Returns how long that took, in ms. */
  draw(date: Date): number
}

// Quantising brightness means a dot's fill is only rewritten when it actually
// changes shade, so dragging the slider touches the dots near the terminator
// instead of all of them.
const SHADES = 24

const shadeOf = (result: DaynightResult) => Math.round(result.brightness * (SHADES - 1))

export const createDots = (): DotsLayer => {
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  element.setAttribute('viewBox', `0 0 ${VIEW.width} ${VIEW.height}`)
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

    const [x, y] = project(result.coordinates[0], result.coordinates[1])
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('cx', String(x))
    circle.setAttribute('cy', String(y))
    circle.setAttribute('r', '11')
    circle.setAttribute('class', 'map__dot')
    circle.dataset.timezone = timezone
    circle.setAttribute('tabindex', '0')
    circle.setAttribute('role', 'listitem')

    element.append(circle)
    dots.push({ timezone, circle, result })
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

  return { element, dots, draw }
}
