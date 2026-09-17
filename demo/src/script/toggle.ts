// The scroll-in theme switch. The hero title says Day and Night in big type at
// the top of the page; once it scrolls out of reach this takes over the job,
// pinned to the top, and looks like something you press.
import { toggleTheme } from './theme'

const toggle = document.querySelector<HTMLElement>('[data-toggle]')
const title = document.querySelector<HTMLElement>('.hero__title')

if (toggle) {
  let frame = 0

  const update = () => {
    frame = 0

    // Fully swapped over by the time the title has left the viewport, so the
    // two never sit on screen claiming the same job.
    const handover = title ? title.getBoundingClientRect().bottom + window.scrollY : 200
    const progress = Math.min(1, Math.max(0, window.scrollY / Math.max(1, handover)))

    document.documentElement.style.setProperty('--toggle-in', progress.toFixed(3))
    toggle.classList.toggle('is-shown', progress > 0.35)
  }

  window.addEventListener('scroll', () => {
    // One write per frame, whatever the scroll device fires.
    if (!frame) frame = requestAnimationFrame(update)
  })

  window.addEventListener('resize', update)

  toggle.addEventListener('click', () => {
    toggleTheme()
    syncPressed()
  })

  syncPressed()
  update()
}

function syncPressed() {
  toggle?.setAttribute('aria-pressed', String(document.body.classList.contains('night')))
}
