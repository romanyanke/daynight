import { DaynightResult } from 'daynight'
import { Dot } from './dots'

const timeIn = (date: Date, timezone: string) =>
  date.toLocaleTimeString([], { timeZone: timezone, hour: '2-digit', minute: '2-digit' })

const describe = (result: DaynightResult, date: Date): string => {
  const place = result.timezone.split('/').slice(-1)[0].replace(/_/g, ' ')
  const local = timeIn(date, result.timezone)

  if (result.polar === 'day') {
    return `${place} · ${local} · midnight sun, the sun does not set today`
  }
  if (result.polar === 'night') {
    return `${place} · ${local} · polar night, the sun does not rise today`
  }

  const sunrise = timeIn(result.sunrise, result.timezone)
  const sunset = timeIn(result.sunset, result.timezone)

  return `${place} · ${local} · ${result.light ? 'day' : 'night'} · sunrise ${sunrise}, sunset ${sunset}`
}

export interface Tooltip {
  element: HTMLElement
  /** Call after a redraw so a tooltip left open keeps showing live values. */
  refresh(date: Date): void
}

export const createTooltip = (container: HTMLElement, dots: Dot[]): Tooltip => {
  const element = document.createElement('div')
  element.className = 'map__tooltip'
  element.setAttribute('role', 'status')
  element.hidden = true

  const byTimezone = new Map(dots.map(dot => [dot.timezone, dot]))
  let shown: Dot | undefined
  let lastDate = new Date()

  const show = (target: EventTarget | null) => {
    const timezone = (target as Element | null)?.getAttribute?.('data-timezone')
    const dot = timezone ? byTimezone.get(timezone) : undefined
    if (!dot) return

    shown = dot
    element.textContent = describe(dot.result, lastDate)
    // Unhide before measuring: offsetWidth is 0 while the element is hidden.
    element.hidden = false

    // Position from the circle's own on-screen box, so this works the same
    // for a mouse hover and for keyboard focus, which has no pointer.
    const box = dot.circle.getBoundingClientRect()
    const bounds = container.getBoundingClientRect()

    // On a phone the map is only a few hundred pixels wide -- narrower than a
    // line of tooltip text -- so cap the bubble to the map before measuring
    // it, and let it wrap onto a second line.
    element.style.maxWidth = `${bounds.width - 8}px`

    // Keep the bubble inside the map, which clips anything that leaves it.
    // Dots sit as far out as Kiritimati and Samoa, a few pixels from either
    // edge, and the tooltip is centred on the dot -- so without clamping it
    // hangs off the side. Above the dot it would likewise be cut off for the
    // Arctic zones along the top edge, so there it flips underneath.
    const half = element.offsetWidth / 2
    const centre = box.left - bounds.left + box.width / 2
    element.style.left = `${Math.min(Math.max(centre, half + 4), bounds.width - half - 4)}px`

    const top = box.top - bounds.top
    // The bubble is lifted by 125% of its own height (see the transform), so
    // that -- not its plain height -- is what has to fit above the dot. A
    // tooltip that wrapped onto two lines needs twice as much room.
    const below = top < element.offsetHeight * 1.25 + 4
    element.classList.toggle('map__tooltip--below', below)
    element.style.top = `${below ? top + box.height : top}px`
  }

  const hide = () => {
    shown = undefined
    element.hidden = true
  }

  // One delegated listener per event rather than four per dot.
  container.addEventListener('pointerover', event => show(event.target))
  container.addEventListener('pointerout', hide)
  container.addEventListener('focusin', event => show(event.target))
  container.addEventListener('focusout', hide)

  container.append(element)

  return {
    element,
    refresh(date) {
      lastDate = date
      if (shown) element.textContent = describe(shown.result, date)
    },
  }
}
