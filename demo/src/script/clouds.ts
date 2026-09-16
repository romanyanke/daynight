// The day theme's backdrop: a few soft clouds that sway rather than race, so
// the light side of the page has the same quiet life as the star field does.
import { trackParallax } from './parallax'

const layer = document.querySelector<HTMLElement>('[data-clouds]')

const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')

const random = (min: number, max: number) => min + Math.random() * (max - min)

if (layer) {
  fillClouds(layer)

  // Clouds move a touch more than the stars: they read as the nearer layer.
  if (!prefersReducedMotion?.matches) trackParallax(layer, 0.1)
}

function fillClouds(container: HTMLElement) {
  // Far fewer than there are stars, and every one of them different: a fixed
  // arrangement would be recognisable the second time you load the page.
  const count = Math.round(random(5, 9))
  const fragment = document.createDocumentFragment()

  for (let i = 0; i < count; i++) {
    const width = random(9, 20)

    const cloud = document.createElement('span')
    cloud.className = 'cloud'
    cloud.style.left = `${random(-6, 92).toFixed(1)}%`
    cloud.style.top = `${random(0, 92).toFixed(1)}%`
    cloud.style.width = `${width.toFixed(1)}vw`
    cloud.style.height = `${(width * random(0.38, 0.55)).toFixed(1)}vw`
    cloud.style.setProperty('--haze', random(0.35, 0.7).toFixed(2))
    cloud.style.setProperty('--sway', `${random(1, 4).toFixed(1)}vw`)
    cloud.style.setProperty('--drift', `${random(40, 110).toFixed(0)}s`)
    cloud.style.setProperty('--drift-delay', `${(-random(0, 40)).toFixed(0)}s`)

    cloud.append(buildBody())
    fragment.append(cloud)
  }

  container.append(fragment)
}

// The shape itself: a slab across the bottom with three to five circles
// standing on it, each a random size and offset, so no two clouds repeat.
function buildBody() {
  const body = document.createDocumentFragment()

  const base = document.createElement('span')
  base.className = 'cloud__base'
  body.append(base)

  const puffs = Math.round(random(3, 5))

  for (let i = 0; i < puffs; i++) {
    // Spread across the width in even slots, jittered inside each one: left to
    // pure chance the circles clump up and leave a gap at one end.
    const slot = (i + random(0.15, 0.85)) / puffs
    // The middle of a cloud stands taller than its ends.
    const shoulder = 1 - Math.abs(slot - 0.5) * 1.2
    const size = random(45, 75) * shoulder

    const puff = document.createElement('span')
    puff.className = 'cloud__puff'
    puff.style.width = `${size.toFixed(1)}%`
    // Circles: the height is a share of the cloud width, same as the width is.
    puff.style.aspectRatio = '1'
    puff.style.left = `${(slot * 100 - size / 2).toFixed(1)}%`
    body.append(puff)
  }

  return body
}
