import { default as daynight } from '../src'

describe('Asia/Novosibirsk GMT+7', () => {
  it('summer day sunrise', () => {
    expect(
      daynight({
        timeZone: 'Asia/Novosibirsk',
        date: new Date('2015-07-15T05:00+07:00'),
      }),
    ).toMatchObject({ light: false })

    expect(
      daynight({
        timeZone: 'Asia/Novosibirsk',
        date: new Date('2015-07-15T05:30+07:00'),
      }),
    ).toMatchObject({ light: true })
  })

  it('summer day sunset', () => {
    expect(
      daynight({
        timeZone: 'Asia/Novosibirsk',
        date: new Date('2015-07-15T22:00+07:00'),
      }),
    ).toMatchObject({ light: true })
    expect(
      daynight({
        timeZone: 'Asia/Novosibirsk',
        date: new Date('2015-07-15T23:30+07:00'),
      }),
    ).toMatchObject({ light: false })
  })

  it('winter day sunrise', () => {
    expect(
      daynight({
        timeZone: 'Asia/Novosibirsk',
        date: new Date('2015-01-15T09:00+07:00'),
      }),
    ).toMatchObject({ light: false })

    expect(
      daynight({
        timeZone: 'Asia/Novosibirsk',
        date: new Date('2015-01-15T10:00+07:00'),
      }),
    ).toMatchObject({ light: true })
  })

  it('winter day sunset', () => {
    expect(
      daynight({
        timeZone: 'Asia/Novosibirsk',
        date: new Date('2015-01-15T17:00+07:00'),
      }),
    ).toMatchObject({ light: true })

    expect(
      daynight({
        timeZone: 'Asia/Novosibirsk',
        date: new Date('2015-01-15T18:00+07:00'),
      }),
    ).toMatchObject({ light: false })
  })
})

describe('White night and polar night', () => {
  it('summer day sunrise', () => {
    expect(
      daynight({
        timeZone: 'Europe/Moscow',
        date: new Date('2015-06-15T21:30+04:00'),
      }),
    ).toMatchObject({ light: true })
  })

  it('summer day sunrise', () => {
    expect(
      daynight({
        timeZone: 'Arctic/Longyearbyen',
        date: new Date('2015-12-20T12:00+04:00'),
      }),
    ).toMatchObject({ light: false })
  })
})

describe('Errors', () => {
  describe('timezone is incorrect', () => {
    it('should return an error', () => {
      expect(
        daynight({
          timeZone: 'i-am-not-a-tz',
        }),
      ).toMatchObject({ error: expect.any(Error) })
    })
  })

  describe('Intl is not supported', () => {
    beforeAll(() => {
      ;(global as any).Intl = undefined
    })
    it('should return an error', () => {
      expect(daynight()).toMatchObject({ error: expect.any(TypeError) })
    })
  })
})
