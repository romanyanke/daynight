// Every timezone the library knows, recomputed once per instant.
//
// Both views -- the globe and the flat map -- plot the same zones, and each
// dot's colour comes straight from daynight(). Computing that per view would
// double the work the page is there to show off, so it happens here once and
// both views read the result.
import daynight, { DaynightResult } from 'daynight'
import { ZONES } from './zones'

export interface Zone {
  timezone: string
  lon: number
  lat: number
  result: DaynightResult
  /** Brightness quantised to a shade, so a view only repaints what changed. */
  shade: number
}

export interface ZoneState {
  zones: Zone[]
  byTimezone: Map<string, Zone>
  /** Recomputes every zone for `date`. Returns how long that took, in ms. */
  update(date: Date): number
}

// Quantising brightness means a dot's fill is only rewritten when it actually
// changes shade, so dragging the slider touches the dots near the terminator
// instead of all of them.
export const SHADES = 24

const shadeOf = (result: DaynightResult) => Math.round(result.brightness * (SHADES - 1))

export const createZoneState = (): ZoneState => {
  const zones: Zone[] = []

  for (const timezone of ZONES) {
    try {
      const result = daynight({ timezone })

      zones.push({
        timezone,
        lon: result.coordinates[0],
        lat: result.coordinates[1],
        result,
        shade: shadeOf(result),
      })
    } catch {
      // A zone the table cannot place. Nothing to draw, and nothing worth
      // interrupting the page for.
    }
  }

  return {
    zones,
    byTimezone: new Map(zones.map(zone => [zone.timezone, zone])),
    update(date) {
      const started = performance.now()

      for (const zone of zones) {
        zone.result = daynight({ timezone: zone.timezone, date })
        zone.shade = shadeOf(zone.result)
      }

      return performance.now() - started
    },
  }
}
