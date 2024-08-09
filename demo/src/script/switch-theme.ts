import { toggleTheme } from './theme'

let cooldown = 0
const animationDuration =
  parseFloat(getComputedStyle(document.body).getPropertyValue('--day-length')) * 1000

document.body.addEventListener('click', e => {
  console.log(e)

  const now = performance.now()
  if (cooldown + animationDuration > now) {
    return
  }

  toggleTheme()
  cooldown = now
})
