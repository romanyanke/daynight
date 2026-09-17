// Time-of-day and date controls. Reports the chosen instant through a
// callback; coalescing several input events into one animation frame keeps a
// 120Hz trackpad from asking for more redraws than the screen can show.
export interface TimeControls {
  element: HTMLElement
  /** The instant currently selected. */
  current(): Date
}

const MINUTES_PER_DAY = 24 * 60

const startOfUTCDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

/** 366 in a leap year, 365 otherwise -- the range the date slider spans. */
const daysInYear = (year: number) => (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000

/** 0 for 1 January, so the slider index is a day of the year. */
const dayOfYear = (date: Date) =>
  (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86400000

const wrap = (value: number, span: number) => ((value % span) + span) % span

/**
 * How far to move from `from` to `to` on a dial of `span` steps, taking
 * whichever way round is shorter. Negative to go backwards.
 */
const shortestStep = (from: number, to: number, span: number) => {
  const forwards = wrap(to - from, span)
  return forwards <= span / 2 ? forwards : forwards - span
}

export const createTimeControls = (
  onChange: (date: Date) => void,
  onNow: () => void = () => {},
): TimeControls => {
  const prefersReducedMotion = Boolean(
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )

  const now = new Date()
  const year = now.getUTCFullYear()
  const lastDay = daysInYear(year) - 1

  let dayIndex = dayOfYear(startOfUTCDay(now))
  let minutes = now.getUTCHours() * 60 + now.getUTCMinutes()

  const element = document.createElement('div')
  element.className = 'controls'
  element.innerHTML = `
    <label class="controls__row">
      <span class="controls__label">Time <b class="controls__value" data-time></b> UTC</span>
      <input type="range" class="controls__range" data-minutes
             min="0" max="${MINUTES_PER_DAY - 1}" step="1" value="${minutes}"
             aria-label="Time of day, UTC">
    </label>
    <label class="controls__row">
      <span class="controls__label">Date <b class="controls__value" data-date></b></span>
      <input type="range" class="controls__range" data-day
             min="0" max="${lastDay}" step="1" value="${dayIndex}"
             aria-label="Day of the year, ${year}">
    </label>
    <button type="button" class="controls__now" data-now>Back to now</button>
  `

  const minutesInput = element.querySelector<HTMLInputElement>('[data-minutes]')!
  const dayInput = element.querySelector<HTMLInputElement>('[data-day]')!
  const timeOut = element.querySelector<HTMLElement>('[data-time]')!
  const dateOut = element.querySelector<HTMLElement>('[data-date]')!

  const current = () => new Date(Date.UTC(year, 0, 1) + dayIndex * 86400000 + minutes * 60000)

  let scheduled = false
  const schedule = ({ immediate = false } = {}) => {
    if (scheduled) return

    const render = () => {
      scheduled = false
      const date = current()
      timeOut.textContent = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(
        minutes % 60,
      ).padStart(2, '0')}`
      dateOut.textContent = date.toLocaleDateString([], {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
      onChange(date)
    }

    if (immediate) {
      render()
      return
    }

    scheduled = true
    requestAnimationFrame(render)
  }

  minutesInput.addEventListener('input', () => {
    // A hand on a slider wins over an animation still playing.
    stopRewind()
    minutes = Number(minutesInput.value)
    schedule()
  })

  dayInput.addEventListener('input', () => {
    stopRewind()
    dayIndex = Number(dayInput.value)
    schedule()
  })

  // Winding the clock back rather than snapping it: the sliders travel to now
  // over the same moment the globe takes to turn there, so the terminator
  // sweeps across the map instead of jumping. Both dials are circular, so each
  // takes the short way round -- from 23:50 to 00:10 is twenty minutes
  // forwards, not a whole day backwards.
  const REWIND = 900

  let rewind = 0

  const stopRewind = () => {
    cancelAnimationFrame(rewind)
    rewind = 0
  }

  const goToNow = () => {
    const rightNow = new Date()
    const targetDay = dayOfYear(startOfUTCDay(rightNow))
    const targetMinutes = rightNow.getUTCHours() * 60 + rightNow.getUTCMinutes()

    const set = (day: number, minute: number) => {
      dayIndex = day
      minutes = minute
      minutesInput.value = String(minutes)
      dayInput.value = String(dayIndex)
      schedule()
    }

    if (prefersReducedMotion) {
      set(targetDay, targetMinutes)
      return
    }

    const fromDay = dayIndex
    const fromMinutes = minutes
    const dayCount = lastDay + 1

    const dayStep = shortestStep(fromDay, targetDay, dayCount)
    const minuteStep = shortestStep(fromMinutes, targetMinutes, MINUTES_PER_DAY)

    if (dayStep === 0 && minuteStep === 0) return

    const started = performance.now()

    const rewindFrame = () => {
      const t = Math.min(1, (performance.now() - started) / REWIND)
      // Ease out, matching the globe's glide, so the two read as one movement.
      const eased = 1 - Math.pow(1 - t, 3)

      set(
        wrap(Math.round(fromDay + dayStep * eased), dayCount),
        wrap(Math.round(fromMinutes + minuteStep * eased), MINUTES_PER_DAY),
      )

      rewind = t < 1 ? requestAnimationFrame(rewindFrame) : 0
    }

    rewindFrame()
  }

  element.querySelector('[data-now]')!.addEventListener('click', () => {
    stopRewind()
    onNow()
    goToNow()
  })

  // The first frame is drawn synchronously rather than through rAF, which
  // does not fire in a background tab -- and a link opened in one (a
  // middle-click from a feed, say) would otherwise sit as an empty shell
  // until it was brought to the front. Subsequent frames stay on rAF, which
  // is what coalesces slider input.
  schedule({ immediate: true })

  return { element, current }
}
