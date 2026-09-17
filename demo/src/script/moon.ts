// Every moon on the page shows the phase the date actually has -- the one
// arcing over the hero and the one on the theme switch -- so dragging the date
// slider walks them through the month rather than leaving a fixed crescent
// sitting there.
//
// Eight steps, because Unicode has eight moons and no more. That is plenty:
// against a slider the phase then changes in visible jumps instead of drifting
// imperceptibly.

/** Mean length of a lunation, in days. */
const SYNODIC = 29.530588853

/** A new moon to count from: 6 January 2000, 18:14 UTC. */
const EPOCH = Date.UTC(2000, 0, 6, 18, 14)

// Index 0 is new, 4 is full. Those two keep a face, like the sun does; the
// waxing and waning ones have none to keep, so they are the plain glyphs.
const PHASES = ['🌚', '🌒', '🌓', '🌔', '🌝', '🌖', '🌗', '🌘']

export interface Moon {
  /**
   * Sets the phase for `date`. A negative `latitude` flips it: the same moon
   * seen from the southern hemisphere is lit on the other side, which no
   * emoji set accounts for.
   */
  update(date: Date, latitude: number): void
}

export const createMoon = (): Moon => {
  const moons = document.querySelectorAll<HTMLElement>('[data-moon]')

  return {
    update(date, latitude) {
      const days = (date.getTime() - EPOCH) / 86400000
      const age = ((days % SYNODIC) + SYNODIC) % SYNODIC
      // Rounded rather than floored, so each glyph covers the phase it is
      // nearest to and full moon lands on the day it is actually full.
      const phase = Math.round((age / SYNODIC) * PHASES.length) % PHASES.length

      const glyph = PHASES[phase]
      const flip = latitude < 0 ? 'scaleX(-1)' : ''

      for (const moon of moons) {
        moon.textContent = glyph
        moon.style.transform = flip
      }
    },
  }
}
