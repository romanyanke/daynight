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

    // Keep the bubble inside the map. Dots sit as far out as Kiritimati and
    // Samoa, a few pixels from either edge, and the tooltip is centred on the
    // dot -- so without clamping it hangs off the page on a phone.
    const half = element.offsetWidth / 2
    const centre = box.left - bounds.left + box.width / 2
    element.style.left = `${Math.min(Math.max(centre, half + 4), bounds.width - half - 4)}px`
    element.style.top = `${box.top - bounds.top}px`
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
