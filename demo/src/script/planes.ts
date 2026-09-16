// Daytime air traffic: one to five aircraft crossing the sky on their own
// headings, each pulling a contrail behind it.
import { trackParallax } from './parallax'
import { random, renderOnTheme } from './scene'

const layer = document.querySelector<HTMLElement>('[data-planes]')

const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')

if (layer && !prefersReducedMotion?.matches) {
  renderOnTheme(layer, 'day', fillSky)

  // The nearest of the three layers, so it answers the scroll the most.
  trackParallax(layer, 0.14)
}

function fillSky(container: HTMLElement) {
  const count = Math.round(random(1, 5))
  const fragment = document.createDocumentFragment()

  for (let i = 0; i < count; i++) {
    // Half of them fly the other way. The heading is a rotation of the whole
    // arm, so flying west is the same code with 180 degrees added.
    const westbound = Math.random() < 0.5
    const pitch = random(-14, 14)

    const plane = document.createElement('span')
    plane.className = 'plane'
    plane.style.left = westbound ? '100%' : '0'
    plane.style.top = `${random(2, 70).toFixed(1)}%`
    plane.style.width = `${random(6, 20).toFixed(1)}vw`
    plane.style.setProperty('--angle', `${(westbound ? 180 + pitch : pitch).toFixed(1)}deg`)
    plane.style.setProperty('--size', `${random(5, 9).toFixed(1)}px`)
    plane.style.setProperty('--haze', random(0.3, 0.7).toFixed(2))
    // Slow: an aircraft high enough to leave a contrail barely seems to move.
    plane.style.setProperty('--duration', `${random(28, 70).toFixed(0)}s`)
    // Negative, so the sky already has traffic in it when the page opens
    // rather than filling up over the first minute.
    plane.style.setProperty('--delay', `${(-random(0, 60)).toFixed(0)}s`)

    const trail = document.createElement('span')
    trail.className = 'plane__trail'

    const body = document.createElement('span')
    body.className = 'plane__body'

    plane.append(trail, body)
    fragment.append(plane)
  }

  container.append(fragment)
}
