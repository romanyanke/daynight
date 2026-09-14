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
    ).toMatchObject({ coordinates: [-5.5, 7.5] })
  })
})

describe('sunrise/sunset/brightness values (not just light/dark)', () => {
  it('computes the exact sunrise and sunset instants for a known date/location', () => {
    const result = daynight({
      timezone: 'Africa/Abidjan',
      date: new Date('2015-06-15T12:00Z'),
    })

    expect(result.sunrise.toISOString()).toBe('2015-06-15T06:06:00.000Z')
    expect(result.sunset.toISOString()).toBe('2015-06-15T18:39:00.000Z')
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
    beforeAll(() => {
      ;(global as any).Intl = undefined
    })
    it('should return an error', () => {
      expect(() => daynight()).toThrow(TypeError)
    })
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
