import { toggleTheme } from './theme'

let cooldown = 0
const animationDuration =
  parseFloat(getComputedStyle(document.body).getPropertyValue('--day-length')) * 1000

// Listen on the decorative sky rather than on body: with the landing page in
// place, a listener on body turns every click on the map, a dot, the slider
// or a button into a theme toggle.
const sky = document.querySelector('.sky')!

sky.addEventListener('click', () => {
  const now = performance.now()
  if (cooldown + animationDuration > now) {
    return
  }

  toggleTheme()
  cooldown = now
})
