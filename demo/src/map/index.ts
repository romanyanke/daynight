import { createGlobe } from './globe'
import { createDots, Dot } from './dots'
import { createTooltip } from './tooltip'
import { createSpin } from './spin'
import { THEME_EVENT } from '../script/theme'

export interface WorldMap {
  /** Redraws for `date`; returns how long recomputing every zone took, in ms. */
  setDate(date: Date): number
  /** Marks one zone as the visitor's own. */
  highlight(timezone: string): void
  /** How many zones are actually plotted. */
  zoneCount: number
  /** The plotted zone by name, carrying its latest result. */
  dotFor(timezone: string): Dot | undefined
}

export const mountMap = (container: HTMLElement): WorldMap => {
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  // The globe is a control, not a picture: it takes focus so the arrow keys in
  // spin.ts reach it without a pointer.
  container.tabIndex = 0
  container.setAttribute('role', 'application')
  container.setAttribute(
    'aria-label',
    'Globe of every timezone. Drag, or use the arrow keys, to spin it.',
  )

  // Globe below, dots above: a dot reports what daynight() says about a zone,
  // so it is never dimmed by the shading drawn under it.
  const globe = createGlobe()
  container.append(globe.element)

  const dots = createDots()
  container.append(dots.element)

  const tooltip = createTooltip(container, dots.dots)

  let date = new Date()
  let frame = 0

  const render = () => {
    frame = 0
    globe.draw(date, spin.rotation)
    dots.place(spin.rotation)
  }

  // One render per frame however many turns, resizes or redraws ask for it.
  const invalidate = () => {
    if (!frame) frame = requestAnimationFrame(render)
  }

  const spin = createSpin(container, invalidate, Boolean(prefersReducedMotion))

  // The canvas is sized from its box, and the box follows the page width.
  new ResizeObserver(invalidate).observe(container)

  // Sea, land and rim are theme colours read out of CSS, so they have to be
  // re-read when the theme flips -- a canvas does not cascade.
  document.addEventListener(THEME_EVENT, () => {
    globe.refreshColours()
    invalidate()
  })

  const byTimezone = new Map(dots.dots.map(dot => [dot.timezone, dot]))

  render()

  return {
    zoneCount: dots.dots.length,
    dotFor: timezone => byTimezone.get(timezone),
    setDate(next) {
      date = next
      const elapsed = dots.draw(next)
      invalidate()
      tooltip.refresh(next)
      return elapsed
    },
    highlight(timezone) {
      for (const dot of dots.dots) {
        dot.circle.classList.toggle('map__dot--home', dot.timezone === timezone)
      }
    },
  }
}
