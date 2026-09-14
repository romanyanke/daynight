import { VIEW } from './projection'
import { LAND_PATH, LAND_VIEW } from './land'
import { createTerminator } from './terminator'
import { createDots } from './dots'
import { createTooltip } from './tooltip'

import { Dot } from './dots'

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

const svgNS = 'http://www.w3.org/2000/svg'

export const mountMap = (container: HTMLElement): WorldMap => {
  // The land outline is generated against the projection in projection.ts.
  // If someone changes the viewBox without regenerating, the coastline would
  // drift out from under the dots -- silently, and only visibly wrong in
  // places nobody looks. Fail loudly instead.
  if (LAND_VIEW.width !== VIEW.width || LAND_VIEW.height !== VIEW.height) {
    throw new Error('land.ts was generated for a different projection; run `npm run generate:land`')
  }

  const terminator = createTerminator()
  container.append(terminator.element)

  const land = document.createElementNS(svgNS, 'svg')
  land.setAttribute('viewBox', `0 0 ${VIEW.width} ${VIEW.height}`)
  land.setAttribute('class', 'map__land')
  land.setAttribute('aria-hidden', 'true')
  const path = document.createElementNS(svgNS, 'path')
  path.setAttribute('d', LAND_PATH)
  land.append(path)
  container.append(land)

  const dots = createDots()
  container.append(dots.element)

  const tooltip = createTooltip(container, dots.dots)

  const byTimezone = new Map(dots.dots.map(dot => [dot.timezone, dot]))

  return {
    zoneCount: dots.dots.length,
    dotFor: timezone => byTimezone.get(timezone),
    setDate(date) {
      terminator.draw(date)
      const elapsed = dots.draw(date)
      tooltip.refresh(date)
      return elapsed
    },
    highlight(timezone) {
      for (const dot of dots.dots) {
        dot.circle.classList.toggle('map__dot--home', dot.timezone === timezone)
      }
    },
  }
}
