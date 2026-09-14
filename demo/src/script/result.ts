import daynight, { DaynightResult } from 'daynight'

// The visitor's own result, shown as the chain of reasoning that produced it
// rather than a bare verdict: which timezone the browser reported, where the
// centre of that zone is, what the sun does there, and only then the answer.
// Someone arriving cold should learn both what daynight() says about them and
// how it got there -- and should see, in the first line, that nothing was
// asked of them and no location was looked up.

export interface PersonalResult {
  element: HTMLElement
  /** Redraws for `date`. Returns the result, or null when the zone is unknown. */
  update(date: Date): DaynightResult | null
  /** The timezone the browser reported, whether or not it could be placed. */
  timezone: string
}

const formatCoordinate = (value: number, positive: string, negative: string) =>
  `${Math.abs(value).toFixed(1)}° ${value >= 0 ? positive : negative}`

const timeIn = (date: Date, timezone: string) =>
  date.toLocaleTimeString([], { timeZone: timezone, hour: '2-digit', minute: '2-digit' })

const row = (label: string, value: string, note = '') => `
  <div class="personal__row">
    <span class="personal__label">${label}</span>
    <span class="personal__value">${value}</span>
    ${note ? `<span class="personal__note">${note}</span>` : ''}
  </div>
`

export const createPersonalResult = (): PersonalResult => {
  const element = document.createElement('div')
  element.className = 'personal'

  const timezone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return ''
    }
  })()

  const update = (date: Date): DaynightResult | null => {
    if (!timezone) {
      element.innerHTML = `
        <p class="personal__failure">
          This browser has no <code>Intl</code> API, so there is no timezone to work from.
          A page would fall back to <code>prefers-color-scheme</code> here.
        </p>`
      return null
    }

    let result: DaynightResult
    try {
      result = daynight({ timezone, date })
    } catch (error) {
      element.innerHTML = `
        <p class="personal__failure">
          Your browser reports <b>${timezone}</b>, which is not in the coordinate table,
          so <code>daynight()</code> throws: <code>${(error as Error).message}</code>.
          A page would fall back to <code>prefers-color-scheme</code> here.
        </p>`
      return null
    }

    const [lon, lat] = result.coordinates
    const renamed = result.timezone !== timezone

    const verdict =
      result.polar === 'day'
        ? 'The sun does not set there today → <b>🌞 day</b>'
        : result.polar === 'night'
          ? 'The sun does not rise there today → <b>🌚 night</b>'
          : result.light
            ? 'Between sunrise and sunset → <b>🌞 day</b>'
            : 'Outside sunrise and sunset → <b>🌚 night</b>'

    const sunLine =
      result.polar === 'day'
        ? 'midnight sun — no sunset'
        : result.polar === 'night'
          ? 'polar night — no sunrise'
          : `sunrise ${timeIn(result.sunrise, result.timezone)}, sunset ${timeIn(result.sunset, result.timezone)}`

    element.innerHTML = `
      ${row('Your browser said', `<b>${timezone}</b>`, 'Intl.DateTimeFormat()')}
      ${renamed ? row('Which is now called', `<b>${result.timezone}</b>`, 'renamed by IANA') : ''}
      ${row(
        'Centre of that zone',
        `${formatCoordinate(lon, 'E', 'W')}, ${formatCoordinate(lat, 'N', 'S')}`,
        'from a table of 418 zones',
      )}
      ${row('The sun there', sunLine, 'computed, not looked up')}
      ${row('Time there', `<b>${timeIn(date, result.timezone)}</b>`)}
      <div class="personal__verdict">
        ${verdict}
        <span class="personal__brightness">brightness ${result.brightness.toFixed(2)}</span>
      </div>
      <p class="personal__privacy">
        No permission prompt, no <code>navigator.geolocation</code>, no IP lookup, no network
        request. Everything above came from your timezone name alone.
      </p>
    `

    return result
  }

  return { element, update, timezone }
}
