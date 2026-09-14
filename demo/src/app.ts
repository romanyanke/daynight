import './script/theme'
import './script/switch-theme'
import { mountMap } from './map'
import { createTimeControls } from './script/time-slider'
import { createPersonalResult } from './script/result'
import { createSnippet } from './script/snippet'

const map = mountMap(document.querySelector<HTMLElement>('[data-map]')!)
const personal = createPersonalResult()
const snippet = createSnippet()

document.querySelector('[data-personal]')!.append(personal.element)
document.querySelector('[data-snippet]')!.append(snippet.element)

const stats = document.querySelector<HTMLElement>('[data-stats]')!

// Which zone the code sample and the stats line talk about: the visitor's own
// by default, whichever dot they point at otherwise.
let focused = personal.timezone

const controls = createTimeControls(date => {
  const elapsed = map.setDate(date)
  const personalResult = personal.update(date)

  // The map recomputed every zone just now, so the focused dot already holds
  // a result for this instant -- no need to call daynight() again for it.
  const focusedResult =
    focused === personal.timezone ? personalResult : (map.dotFor(focused)?.result ?? null)

  snippet.update(focused, date, focusedResult)

  stats.innerHTML = `
    <b>${map.zoneCount}</b> daynight() calls in <b>${elapsed.toFixed(1)} ms</b>
    <span>·</span> 6.9 KB gzipped
    <span>·</span> 0 dependencies
    <span>·</span> 0 permissions
  `
})

document.querySelector('[data-controls]')!.append(controls.element)

if (personal.timezone) map.highlight(personal.timezone)

// Pointing at a dot retargets the code sample to that zone, so the snippet
// always shows a call the page is really making.
document.querySelector('[data-map]')!.addEventListener('pointerover', event => {
  const timezone = (event.target as Element).getAttribute?.('data-timezone')
  if (!timezone) return

  focused = timezone
  snippet.update(timezone, controls.current(), map.dotFor(timezone)?.result ?? null)
})
