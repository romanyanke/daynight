// The star field for the night theme: a fixed layer of small dots that twinkle,
// plus the occasional shooting star. Everything lives behind `.page`, so it
// only ever shows through the page background.

const layer = document.querySelector<HTMLElement>('[data-stars]')

const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')

const random = (min: number, max: number) => min + Math.random() * (max - min)

if (layer) {
  fillStarField(layer)

  if (!prefersReducedMotion?.matches) {
    // A streak is a treat, not a metronome: it shows up at an unpredictable
    // gap, and only while the night side is actually on screen.
    scheduleShootingStar(layer)
    trackParallax(layer)
  }
}

function fillStarField(container: HTMLElement) {
  // Roughly one star per 9000 px² of viewport, so a phone does not get the
  // same crowd as a desktop. Positions are percentages, which keeps them sane
  // when the window is resized.
  const area = window.innerWidth * window.innerHeight
  const count = Math.min(160, Math.max(40, Math.round(area / 9000)))

  const fragment = document.createDocumentFragment()

  for (let i = 0; i < count; i++) {
    const star = document.createElement('span')
    const size = random(1, 2.6)
    const bright = random(0.35, 0.95)

    star.className = 'star'
    star.style.left = `${random(0, 100)}%`
    star.style.top = `${random(0, 100)}%`
    star.style.width = `${size.toFixed(2)}px`
    star.style.height = `${size.toFixed(2)}px`
    star.style.setProperty('--bright', bright.toFixed(2))
    star.style.setProperty('--dim', (bright * random(0.2, 0.5)).toFixed(2))
    star.style.setProperty('--twinkle', `${random(1.6, 5.5).toFixed(2)}s`)
    star.style.setProperty('--twinkle-delay', `${random(0, 4).toFixed(2)}s`)

    fragment.append(star)
  }

  container.append(fragment)
}

function scheduleShootingStar(container: HTMLElement) {
  window.setTimeout(
    () => {
      // Nothing to look at if the page is on the day theme or in a background
      // tab -- skip this turn and try again later.
      if (document.body.classList.contains('night') && document.visibilityState === 'visible') {
        launchShootingStar(container)
      }

      scheduleShootingStar(container)
    },
    random(7000, 20000),
  )
}

function launchShootingStar(container: HTMLElement) {
  const streak = document.createElement('span')
  // Half of them fall the other way, so two streaks in a row never look like
  // the same one replayed.
  const toTheLeft = Math.random() < 0.5

  streak.className = 'shooting-star'
  // Always out of the upper part of the sky, entering from whichever side it
  // is heading away from.
  streak.style.left = toTheLeft ? `${random(35, 105)}%` : `${random(-5, 65)}%`
  streak.style.top = `${random(0, 45)}%`
  streak.style.height = `${random(1.5, 2.6).toFixed(1)}px`
  streak.style.setProperty('--length', `${random(50, 150).toFixed(0)}px`)
  streak.style.setProperty(
    '--angle',
    `${(toTheLeft ? random(142, 168) : random(12, 38)).toFixed(1)}deg`,
  )
  streak.style.setProperty('--travel', `${random(30, 75).toFixed(0)}vw`)
  streak.style.setProperty('--duration', `${random(0.6, 1.5).toFixed(2)}s`)

  streak.addEventListener('animationend', () => streak.remove(), { once: true })

  container.append(streak)
}

// A barely-there drift: the sky moves a fraction of the scroll distance, which
// reads as depth without ever pulling the eye away from the page.
function trackParallax(container: HTMLElement) {
  const depth = 0.08
  let frame = 0

  const update = () => {
    frame = 0
    // Clamped to the overhang the stylesheet reserves, so the field never
    // slides off its own edge on a long page.
    const shift = Math.min(window.innerHeight * 0.1, window.scrollY * depth)

    container.style.transform = `translate3d(0, ${(-shift).toFixed(1)}px, 0)`
  }

  window.addEventListener(
    'scroll',
    () => {
      // One write per frame, whatever the scroll device fires.
      if (!frame) frame = requestAnimationFrame(update)
    },
    { passive: true },
  )

  update()
}
