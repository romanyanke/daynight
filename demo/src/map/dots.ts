// One dot per timezone, coloured by the brightness daynight() reports for it.
//
// SVG rather than canvas: 418 circles is nowhere near enough to trouble a
// browser, and hover, keyboard focus and accessible names come for free -- on
// a canvas every one of those would have to be rebuilt by hand. The land and
// the night underneath are canvas for the opposite reason (see globe.ts).
//
// The layer knows nothing about which projection it is drawing: it is handed
// one, and the globe and the flat map pass their own.
import { Zone, ZoneState, SHADES } from './zone-state'

/**
 * The dot radius in viewBox units, shared by both views, and the larger one
 * for a phone -- where the same box is a few hundred pixels wide and a
 * desktop-sized dot shrinks to about two.
 *
 * Both are set as the `r` attribute rather than in the stylesheet: `r` is an
 * SVG geometry property, and only Chromium implements those as CSS. Safari and
 * Firefox drew every dot at radius zero, which is to say not at all.
 */
const BASE_RADIUS = 17
const PHONE_RADIUS = 26
const PHONE = '(max-width: 40rem)'

/** Writes the position of a zone into `out`; returns false for a zone out of sight. */
export type Place = (zone: Zone, out: Float64Array) => boolean

export interface DotsLayer {
  element: SVGSVGElement
  /** Repaints every dot from the current zone state. */
  paint(): void
  /** Moves every dot to where the projection now puts it. */
  place(): void
  /** Marks one zone as the visitor's own. */
  highlight(timezone: string): void
}

export const createDots = (
  state: ZoneState,
  view: { width: number; height: number },
  project: Place,
): DotsLayer => {
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  element.setAttribute('viewBox', `0 0 ${view.width} ${view.height}`)
  element.setAttribute('class', 'map__dots')
  element.setAttribute('role', 'list')
  element.setAttribute('aria-label', 'Timezones')

  const circles = new Map<string, SVGCircleElement>()
  const painted = new Map<string, number>()
  const shown = new Map<string, boolean>()

  for (const zone of state.zones) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('class', 'map__dot')
    circle.dataset.timezone = zone.timezone
    circle.setAttribute('tabindex', '0')
    circle.setAttribute('role', 'listitem')

    element.append(circle)
    circles.set(zone.timezone, circle)
  }

  const phone = window.matchMedia?.(PHONE)

  const sizeDots = () => {
    const radius = String(phone?.matches ? PHONE_RADIUS : BASE_RADIUS)
    for (const circle of circles.values()) circle.setAttribute('r', radius)
  }

  sizeDots()
  phone?.addEventListener?.('change', sizeDots)

  const point = new Float64Array(2)

  return {
    element,

    paint() {
      for (const zone of state.zones) {
        if (painted.get(zone.timezone) === zone.shade) continue
        painted.set(zone.timezone, zone.shade)

        const circle = circles.get(zone.timezone)!
        circle.style.setProperty('--brightness', String(zone.shade / (SHADES - 1)))
        // Polar zones get their own marker: during the midnight sun or the
        // polar night there is no sunrise to be near, and a plain bright or
        // dark dot would hide that.
        circle.classList.toggle('map__dot--polar', zone.result.polar !== null)
      }
    },

    place() {
      for (const zone of state.zones) {
        const circle = circles.get(zone.timezone)!
        const visible = project(zone, point)

        if (shown.get(zone.timezone) !== visible) {
          shown.set(zone.timezone, visible)
          circle.style.display = visible ? '' : 'none'
          // Out of the tab order as well, not merely invisible: the far side
          // of a solid planet should not be reachable.
          if (visible) {
            circle.setAttribute('tabindex', '0')
          } else {
            circle.removeAttribute('tabindex')
          }
        }

        if (!visible) continue

        circle.setAttribute('cx', point[0].toFixed(1))
        circle.setAttribute('cy', point[1].toFixed(1))
      }
    },

    highlight(timezone) {
      for (const [name, circle] of circles) {
        circle.classList.toggle('map__dot--home', name === timezone)
      }
    },
  }
}
