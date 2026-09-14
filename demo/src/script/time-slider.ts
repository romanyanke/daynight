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

export const createTimeControls = (onChange: (date: Date) => void): TimeControls => {
  const now = new Date()
  let day = startOfUTCDay(now)
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
      <input type="date" class="controls__date" data-day
             value="${day.toISOString().slice(0, 10)}" aria-label="Date">
    </label>
    <button type="button" class="controls__now" data-now>Back to now</button>
  `

  const minutesInput = element.querySelector<HTMLInputElement>('[data-minutes]')!
  const dayInput = element.querySelector<HTMLInputElement>('[data-day]')!
  const timeOut = element.querySelector<HTMLElement>('[data-time]')!
  const dateOut = element.querySelector<HTMLElement>('[data-date]')!

  const current = () => new Date(day.getTime() + minutes * 60000)

  let scheduled = false
  const schedule = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      const date = current()
      timeOut.textContent = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(
        minutes % 60,
      ).padStart(2, '0')}`
      dateOut.textContent = date.toLocaleDateString([], {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'short',
      })
      onChange(date)
    })
  }

  minutesInput.addEventListener('input', () => {
    minutes = Number(minutesInput.value)
    schedule()
  })

  dayInput.addEventListener('input', () => {
    const parsed = new Date(`${dayInput.value}T00:00:00Z`)
    if (!Number.isNaN(parsed.getTime())) {
      day = parsed
      schedule()
    }
  })

  element.querySelector('[data-now]')!.addEventListener('click', () => {
    const rightNow = new Date()
    day = startOfUTCDay(rightNow)
    minutes = rightNow.getUTCHours() * 60 + rightNow.getUTCMinutes()
    minutesInput.value = String(minutes)
    dayInput.value = day.toISOString().slice(0, 10)
    schedule()
  })

  schedule()

  return { element, current }
}
