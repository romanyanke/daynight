import daynight from '../src'

describe('Asia/Novosibirsk GMT+7', () => {
  it('summer day sunrise', () => {
    expect(
      daynight(false, {
        timeZoneName: 'Asia/Novosibirsk',
        now: new Date('2015-07-15T05:00+07:00'),
      }),
    ).toBe(false)

    expect(
      daynight(false, {
        timeZoneName: 'Asia/Novosibirsk',
        now: new Date('2015-07-15T05:30+07:00'),
      }),
    ).toBe(true)
  })

  it('summer day sunset', () => {
    expect(
      daynight(false, {
        timeZoneName: 'Asia/Novosibirsk',
        now: new Date('2015-07-15T22:00+07:00'),
      }),
    ).toBe(true)
    expect(
      daynight(true, {
        timeZoneName: 'Asia/Novosibirsk',
        now: new Date('2015-07-15T23:30+07:00'),
      }),
    ).toBe(false)
  })

  it('winter day sunrise', () => {
    expect(
      daynight(true, {
        timeZoneName: 'Asia/Novosibirsk',
        now: new Date('2015-01-15T09:00+07:00'),
      }),
    ).toBe(false)

    expect(
      daynight(false, {
        timeZoneName: 'Asia/Novosibirsk',
        now: new Date('2015-01-15T10:00+07:00'),
      }),
    ).toBe(true)
  })

  it('winter day sunset', () => {
    expect(
      daynight(false, {
        timeZoneName: 'Asia/Novosibirsk',
        now: new Date('2015-01-15T17:00+07:00'),
      }),
    ).toBe(true)

    expect(
      daynight(true, {
        timeZoneName: 'Asia/Novosibirsk',
        now: new Date('2015-01-15T18:00+07:00'),
      }),
    ).toBe(false)
  })
})

describe('Fallback', () => {
  it('should use fallback if time zone name is undefined or incorrect', () => {
    expect(
      daynight(true, {
        timeZoneName: 'i-am-not-a-tz',
      }),
    ).toBe(true)

    expect(
      daynight(false, {
        timeZoneName: 'i-am-not-a-tz',
      }),
    ).toBe(false)
  })
})
