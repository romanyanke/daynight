import { DaynightResult } from 'daynight'

// The call the page is making right now, with the object it actually got
// back. Tracks the slider and the selected dot, so the code on screen is
// never a sample that drifted away from what is being shown.

const asDate = (date: Date) => `new Date('${date.toISOString()}')`

const asResult = (result: DaynightResult) =>
  [
    '{',
    `  theme: '${result.theme}',`,
    `  brightness: ${result.brightness.toFixed(3)},`,
    `  light: ${result.light},`,
    `  dark: ${result.dark},`,
    `  polar: ${result.polar === null ? 'null' : `'${result.polar}'`},`,
    `  timezone: '${result.timezone}',`,
    `  coordinates: [${result.coordinates[0]}, ${result.coordinates[1]}],`,
    `  sunrise: ${asDate(result.sunrise)},`,
    `  sunset: ${asDate(result.sunset)},`,
    '}',
  ].join('\n')

export interface Snippet {
  element: HTMLElement
  update(timezone: string, date: Date, result: DaynightResult | null): void
}

export const createSnippet = (): Snippet => {
  const element = document.createElement('div')
  element.className = 'snippet'
  element.innerHTML = `
    <pre class="snippet__code"><code data-code></code></pre>
    <button type="button" class="snippet__copy" data-copy>Copy</button>
  `

  const code = element.querySelector<HTMLElement>('[data-code]')!
  const copy = element.querySelector<HTMLButtonElement>('[data-copy]')!
  let text = ''

  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text)
      copy.textContent = 'Copied'
      setTimeout(() => (copy.textContent = 'Copy'), 1500)
    } catch {
      copy.textContent = 'Press ⌘C'
    }
  })

  return {
    element,
    update(timezone, date, result) {
      const call = `import daynight from 'daynight'\n\ndaynight({\n  timezone: '${timezone}',\n  date: ${asDate(date)},\n})`

      text = call
      code.textContent = result ? `${call}\n\n// → ${asResult(result)}` : `${call}\n\n// → throws`
    },
  }
}
