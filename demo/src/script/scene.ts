// Shared plumbing for the backdrop layers. Each one draws itself once and then
// again whenever its own theme comes back around, so flipping the switch is a
// new sky rather than a replay of the last one.
import { DaynightTheme } from 'daynight'
import { THEME_EVENT } from './theme'

export const random = (min: number, max: number) => min + Math.random() * (max - min)

export function renderOnTheme(
  container: HTMLElement,
  theme: DaynightTheme,
  draw: (container: HTMLElement) => void,
) {
  draw(container)

  document.addEventListener(THEME_EVENT, event => {
    if ((event as CustomEvent<DaynightTheme>).detail !== theme) return

    // The layer is mid cross-fade at this point, which hides the swap.
    container.replaceChildren()
    draw(container)
  })
}
