// Both views of the same world at once: whichever is in front fills the box,
// the other sits in the corner as a thumbnail. Clicking the thumbnail swaps
// them, and the two slide and scale past each other on the way.
import { createGlobeView, WorldView } from './globe-view'
import { createFlatView } from './flat-view'
import { createTooltip } from './tooltip'
import { createZoneState, Zone } from './zone-state'
import { THEME_EVENT } from '../script/theme'

export interface WorldMap {
  /** Redraws for `date`; returns how long recomputing every zone took, in ms. */
  setDate(date: Date): number
  /** Marks one zone as the visitor's own, and remembers it for `focusHome`. */
  highlight(timezone: string): void
  /** Turns the globe to the visitor's own zone. */
  focusHome(): void
  /** How many zones are actually plotted. */
  zoneCount: number
  /** The plotted zone by name, carrying its latest result. */
  dotFor(timezone: string): Zone | undefined
}

export const mountMap = (container: HTMLElement): WorldMap => {
  const prefersReducedMotion = Boolean(
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )

  const state = createZoneState()

  const globe = createGlobeView(state, prefersReducedMotion)
  const flat = createFlatView(state)

  // The globe leads: it is the one that says "planet" at a glance. The flat
  // map is there for what a ball cannot do -- show every zone at once.
  let front: WorldView = globe
  let back: WorldView = flat

  container.append(globe.element, flat.element)

  const tooltips = [globe, flat].map(view => createTooltip(view.element, state))

  let date = new Date()
  let home: string | undefined

  const arrange = () => {
    front.element.classList.add('map--front')
    front.element.classList.remove('map--pip')
    front.element.removeAttribute('title')
    front.element.setAttribute('role', front.frontRole.role)
    front.element.setAttribute('aria-label', front.frontRole.label)
    // Only the globe is something you operate; the flat map is a picture.
    if (front.frontRole.role === 'application') {
      front.element.tabIndex = 0
    } else {
      front.element.removeAttribute('tabindex')
    }

    // The thumbnail is a button, and says so to a screen reader as well as to
    // a mouse pointer.
    back.element.classList.add('map--pip')
    back.element.classList.remove('map--front')
    back.element.title = back.pipLabel
    back.element.setAttribute('role', 'button')
    back.element.setAttribute('aria-label', back.pipLabel)
    back.element.tabIndex = 0
  }

  const swap = () => {
    const wasFront = front
    front = back
    back = wasFront

    arrange()
    // The thumbnail was drawn for a corner of the box; now it has the whole of
    // it, and a canvas has to be told.
    front.invalidate()
    back.invalidate()
  }

  // Only the thumbnail takes the click. The front view's own pointer handling
  // -- spinning the globe, hovering a dot -- has to stay its own.
  for (const view of [globe, flat]) {
    view.element.addEventListener('click', () => {
      if (view === back) swap()
    })

    view.element.addEventListener('keydown', event => {
      if (view !== back) return
      if (event.key !== 'Enter' && event.key !== ' ') return

      event.preventDefault()
      swap()
    })
  }

  arrange()

  // Sea, land and rim are theme colours read out of CSS, so they have to be
  // re-read when the theme flips -- a canvas does not cascade.
  document.addEventListener(THEME_EVENT, () => {
    for (const view of [globe, flat]) {
      view.refreshColours()
      view.invalidate()
    }
  })

  // Colour before the first draw: without it the dots would sit at the
  // stylesheet's default shade until something moved the clock.
  for (const view of [globe, flat]) {
    view.dots.paint()
    view.render(date)
  }

  return {
    zoneCount: state.zones.length,
    dotFor: timezone => state.byTimezone.get(timezone),

    setDate(next) {
      date = next
      const elapsed = state.update(next)

      for (const view of [globe, flat]) {
        view.dots.paint()
        view.render(next)
      }

      // A tooltip left open keeps showing live values.
      for (const tooltip of tooltips) tooltip.refresh(next)

      return elapsed
    },

    highlight(timezone) {
      home = timezone
      for (const view of [globe, flat]) view.dots.highlight(timezone)
    },

    focusHome() {
      const zone = home ? state.byTimezone.get(home) : undefined
      if (!zone) return

      globe.focus(zone.lon, zone.lat)
    },
  }
}
