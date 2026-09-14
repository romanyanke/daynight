import { default as daynight } from '../src'
import { getProgress } from '../src/brightness'

describe('Asia/Novosibirsk GMT+7', () => {
  it('summer day sunrise', () => {
    expect(
      daynight({
        timezone: 'Asia/Novosibirsk',
        date: new Date('2015-07-15T05:00+07:00'),
      }),
    ).toMatchObject({ light: false })

    expect(
      daynight({
        timezone: 'Asia/Novosibirsk',
        date: new Date('2015-07-15T05:30+07:00'),
      }),
    ).toMatchObject({ light: true })
  })

  it('summer day sunset', () => {
    expect(
      daynight({
        timezone: 'Asia/Novosibirsk',
        date: new Date('2015-07-15T22:00+07:00'),
      }),
    ).toMatchObject({ light: true })
    expect(
      daynight({
        timezone: 'Asia/Novosibirsk',
        date: new Date('2015-07-15T23:30+07:00'),
      }),
    ).toMatchObject({ light: false })
  })

  it('winter day sunrise', () => {
    expect(
      daynight({
        timezone: 'Asia/Novosibirsk',
        date: new Date('2015-01-15T09:00+07:00'),
      }),
    ).toMatchObject({ light: false })

    expect(
      daynight({
        timezone: 'Asia/Novosibirsk',
        date: new Date('2015-01-15T10:00+07:00'),
      }),
    ).toMatchObject({ light: true })
  })

  it('winter day sunset', () => {
    expect(
      daynight({
        timezone: 'Asia/Novosibirsk',
        date: new Date('2015-01-15T17:00+07:00'),
      }),
    ).toMatchObject({ light: true })

    expect(
      daynight({
        timezone: 'Asia/Novosibirsk',
        date: new Date('2015-01-15T18:00+07:00'),
      }),
    ).toMatchObject({ light: false })
  })
})

describe('White night and polar night', () => {
  it('summer day sunrise', () => {
    expect(
      daynight({
        timezone: 'Europe/Moscow',
        date: new Date('2015-06-15T21:30+04:00'),
      }),
    ).toMatchObject({ light: true })
  })

  it('summer day sunrise', () => {
    expect(
      daynight({
        timezone: 'Arctic/Longyearbyen',
        date: new Date('2015-12-20T12:00+04:00'),
      }),
    ).toMatchObject({ light: false })
  })
})

describe('result is independent of the host machine timezone', () => {
  it('gives the same result for the same inputs regardless of process.env.TZ', () => {
    const originalTz = process.env.TZ
    const input = {
      timezone: 'Asia/Novosibirsk',
      date: new Date('2015-07-15T05:15+07:00'),
    }

    try {
      process.env.TZ = 'UTC'
      const inUtc = daynight(input)

      process.env.TZ = 'America/New_York'
      const inNewYork = daynight(input)

      process.env.TZ = 'Pacific/Kiritimati'
      const inKiritimati = daynight(input)

      expect(inNewYork).toEqual(inUtc)
      expect(inKiritimati).toEqual(inUtc)
    } finally {
      process.env.TZ = originalTz
    }
  })
})

describe('timezone coordinates', () => {
  it('decodes the quantized [lon, lat] stored in timeZones.ts back to degrees', () => {
    expect(
      daynight({
        timezone: 'Africa/Abidjan',
        date: new Date('2015-06-15T12:00Z'),
      }),
    ).toMatchObject({ coordinates: [-5.7, 7.5] })
  })
})

describe('sunrise/sunset/brightness values (not just light/dark)', () => {
  it('computes the exact sunrise and sunset instants for a known date/location', () => {
    const result = daynight({
      timezone: 'Africa/Abidjan',
      date: new Date('2015-06-15T12:00Z'),
    })

    expect(result.sunrise.toISOString()).toBe('2015-06-15T06:06:00.000Z')
    expect(result.sunset.toISOString()).toBe('2015-06-15T18:40:00.000Z')
  })

  it('is 0.5 exactly at the sunrise and sunset instants, by definition', () => {
    const atNoon = daynight({
      timezone: 'Africa/Abidjan',
      date: new Date('2015-06-15T12:00Z'),
    })

    expect(daynight({ timezone: 'Africa/Abidjan', date: atNoon.sunrise }).brightness).toBe(0.5)
    expect(daynight({ timezone: 'Africa/Abidjan', date: atNoon.sunset }).brightness).toBe(0.5)
  })
})

describe('Errors', () => {
  describe('timezone is incorrect', () => {
    it('should return an error', () => {
      expect(() => daynight({ timezone: 'i-am-not-a-tz' })).toThrow(
        'Timezone "i-am-not-a-tz" not found',
      )
    })
  })

  describe('timezone points to a region instead of a city', () => {
    it('should return an error instead of throwing a TypeError', () => {
      expect(() => daynight({ timezone: 'Africa' })).toThrow('Timezone "Africa" not found')
    })
  })

  describe('Intl is not supported', () => {
    // Restore Intl afterwards: without this the stub leaks into every test
    // declared after this one, which fails them with a TypeError about
    // DateTimeFormat rather than anything to do with what they assert.
    const realIntl = global.Intl

    beforeAll(() => {
      ;(global as any).Intl = undefined
    })
    afterAll(() => {
      global.Intl = realIntl
    })
    it('should return an error', () => {
      expect(() => daynight()).toThrow(TypeError)
    })
  })
})

describe('timezone centre points are plausible', () => {
  // Guards the generator: taking the centroid of a whole MultiPolygon used to
  // drop Australia/Perth at [133.5, -64.6], in the Southern Ocean, because
  // the Australian Antarctic Territory keeps Perth's time and outweighs
  // Western Australia. Anyone actually in Perth got a badly wrong sunrise.
  it.each([
    ['Australia/Perth', -35, -15],
    ['America/Argentina/Ushuaia', -57, -50],
    ['Europe/London', 48, 60],
    ['Asia/Tokyo', 30, 42],
  ])('puts %s between %i and %i degrees of latitude', (timezone, min, max) => {
    const [, lat] = daynight({ timezone }).coordinates

    expect(lat).toBeGreaterThan(min)
    expect(lat).toBeLessThan(max)
  })

  it('keeps zones outside Antarctica out of Antarctica', () => {
    const outsideAntarctica = ['Australia/Perth', 'America/Argentina/Ushuaia', 'Pacific/Auckland']

    for (const timezone of outsideAntarctica) {
      expect(daynight({ timezone }).coordinates[1]).toBeGreaterThan(-60)
    }
  })
})

describe('polar day and night', () => {
  // Svalbard, well inside the Arctic circle: midnight sun in June, polar
  // night in December. Before the Sunrise/Sunset flags were restored in
  // sun.ts, both came back as sunrise === sunset === local midnight, so the
  // midnight sun read as 'night' with a meaningless brightness.
  it('reports the midnight sun as a full-brightness day', () => {
    const result = daynight({
      timezone: 'Arctic/Longyearbyen',
      date: new Date('2026-06-21T00:00:00Z'),
    })

    expect(result).toMatchObject({ polar: 'day', light: true, dark: false, brightness: 1 })
  })

  it('reports the polar night as a zero-brightness night', () => {
    const result = daynight({
      timezone: 'Arctic/Longyearbyen',
      date: new Date('2026-12-21T12:00:00Z'),
    })

    expect(result).toMatchObject({ polar: 'night', light: false, dark: true, brightness: 0 })
  })

  it('reports the southern hemisphere the other way round', () => {
    expect(
      daynight({ timezone: 'Antarctica/McMurdo', date: new Date('2026-06-21T12:00:00Z') }),
    ).toMatchObject({ polar: 'night' })

    expect(
      daynight({ timezone: 'Antarctica/McMurdo', date: new Date('2026-12-21T12:00:00Z') }),
    ).toMatchObject({ polar: 'day' })
  })

  it('leaves polar null outside the polar circles', () => {
    expect(
      daynight({ timezone: 'Europe/Moscow', date: new Date('2026-06-21T12:00:00Z') }),
    ).toMatchObject({ polar: null })
  })
})

describe('white nights', () => {
  // Just south of the Arctic circle in June the sun sets after midnight and
  // rises again an hour later, so scanning one calendar day finds a sunset
  // that belongs to the previous night -- before that day's sunrise. Left
  // uncorrected, `date > sunset` reported local noon as night.
  it('does not report local noon as night', () => {
    const result = daynight({
      timezone: 'Asia/Krasnoyarsk',
      date: new Date('2026-06-21T06:00:00Z'), // 13:00 local
    })

    expect(result.light).toBe(true)
    expect(result.sunset.getTime()).toBeGreaterThan(result.sunrise.getTime())
  })

  it.each(['Atlantic/Reykjavik', 'America/Anchorage', 'America/Nome', 'America/Whitehorse'])(
    'keeps sunset after sunrise in %s at midsummer',
    timezone => {
      const { sunrise, sunset } = daynight({
        timezone,
        date: new Date('2026-06-21T06:00:00Z'),
      })

      expect(sunset.getTime()).toBeGreaterThan(sunrise.getTime())
    },
  )
})

describe('renamed timezones', () => {
  // Which spelling Intl hands back depends on the runtime's ICU version, so
  // both have to work: on ICU 78 `Intl.supportedValuesOf` still reports
  // 'Europe/Kiev', which used to throw because the table only has the
  // current name.
  it.each([
    ['Europe/Kiev', 'Europe/Kyiv'],
    ['Asia/Calcutta', 'Asia/Kolkata'],
    ['America/Buenos_Aires', 'America/Argentina/Buenos_Aires'],
    ['Asia/Saigon', 'Asia/Ho_Chi_Minh'],
    ['Africa/Asmera', 'Africa/Asmara'],
    ['Pacific/Enderbury', 'Pacific/Kanton'],
  ])('resolves %s to %s', (legacy, current) => {
    const date = new Date('2026-09-14T12:00:00Z')

    expect(daynight({ timezone: legacy, date })).toMatchObject({
      timezone: current,
      coordinates: daynight({ timezone: current, date }).coordinates,
    })
  })

  it('still throws for a name that is no timezone at all', () => {
    expect(() => daynight({ timezone: 'Mars/Olympus' })).toThrow(
      'Timezone "Mars/Olympus" not found',
    )
  })
})

describe('should return getProgress from 0 (min) to 1 (max) and 0.5 for start/end points', () => {
  test('24 cycle', () => {
    const tension = getProgress({ cycle: 24, start: 8, end: 16 })

    expect(tension(24)).toBe(0)
    expect(tension(8)).toBe(0.5)
    expect(tension(12)).toBe(1)
    expect(tension(16)).toBe(0.5)
  })

  test('100 cycle', () => {
    const tension = getProgress({ cycle: 100, start: 20, end: 60 })

    expect(tension(90)).toBe(0)
    expect(tension(20)).toBe(0.5)
    expect(tension(40)).toBe(1)
    expect(tension(60)).toBe(0.5)
  })
})
