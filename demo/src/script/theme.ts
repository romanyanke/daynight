import daynight, { DaynightTheme } from 'daynight'

let theme: DaynightTheme

try {
  theme = daynight().theme
} catch (e) {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    theme = 'night'
  } else {
    theme = 'day'
  }
}

const themes: Record<DaynightTheme, DaynightTheme> = {
  day: 'day',
  night: 'night',
}

let isDarkMode = theme === themes.night

document.body.classList.add(themes[theme])
updateMeta()

// The backdrop layers listen for this to rebuild themselves, so every flip of
// the switch draws a new sky instead of the one you already looked at.
export const THEME_EVENT = 'daynight:theme'

export const toggleTheme = () => {
  isDarkMode = !isDarkMode
  document.body.classList.toggle(themes.day)
  document.body.classList.toggle(themes.night)
  updateMeta()

  document.dispatchEvent(
    new CustomEvent<DaynightTheme>(THEME_EVENT, {
      detail: isDarkMode ? themes.night : themes.day,
    }),
  )
}

function updateMeta() {
  document.documentElement.style.setProperty('color-scheme', isDarkMode ? 'dark' : 'light')

  const color = getComputedStyle(document.body).getPropertyValue('--background')

  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
}
