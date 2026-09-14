// This code is based heavily on this page:
// https://github.com/IonicaBizau/sundown

const PI = Math.PI
const DR = PI / 180
const K1 = 15 * DR * 1.0027379

// Local Sidereal Time for zone
const lst = (lon: number, jd: number, z: number) => {
  let s = 24110.5 + (8640184.812999999 * jd) / 36525 + 86636.6 * z + 86400 * lon
  s = s / 86400
  s = s - Math.floor(s)
  return s * 360 * DR
}

// returns value for sign of argument
const sgn = (x: number) => (x > 0 ? 1 : x < 0 ? -1 : 0)

export interface SundownResult {
  sunrise: Date
  sunset: Date
  // 'day' when the sun stays above the horizon for the whole day (midnight
  // sun), 'night' when it stays below it (polar night), null otherwise.
  // The upstream sundown reports these as the messages "The sun is
  // above/under the horizon the whole day"; here they are reported as data so
  // daynight.ts can special-case them instead of reading a degenerate
  // sunrise === sunset.
  polar: 'day' | 'night' | null
}

export default function sundown(
  d: Date,
  lon: number,
  lat: number,
  // UTC offset, in minutes, of the requested timezone at `d` (same sign
  // convention as Date.prototype.getTimezoneOffset(): positive west of UTC).
  // Passed in explicitly instead of read from `d.getTimezoneOffset()`,
  // because that always reflects the *host machine's* local timezone, not
  // the timezone the caller asked about.
  offsetMinutes: number,
): SundownResult {
  const Rise_time = [0, 0]
  const Set_time = [0, 0]
  let Sunrise = false
  let Sunset = false

  // let ph

  const Sky = [0.0, 0.0]
  const RAn = [0.0, 0.0, 0.0]
  const Dec = [0.0, 0.0, 0.0]
  const VHz = [0.0, 0.0, 0.0]

  // determine Julian day from calendar date
  // (Jean Meeus, "Astronomical Algorithms", Willmann-Bell, 1991)
  const julian_day = (d: Date) => {
    let a, b, jd
    let gregorian
    let month = d.getUTCMonth() + 1
    const day = d.getUTCDate()
    let year = d.getUTCFullYear()
    gregorian = year < 1583 ? false : true
    if (month == 1 || month == 2) {
      year = year - 1
      month = month + 12
    }
    a = Math.floor(year / 100)
    if (gregorian) b = 2 - a + Math.floor(a / 4)
    else b = 0.0
    jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5
    return jd
  }

  // test an hour for an event
  const test_hour = (k: number, t0: number, lat: number) => {
    const ha = new Array(3)
    let a, b, c, d, e, s, z
    let hr, min, time
    let az, dz, hz, nz
    ha[0] = t0 - RAn[0] + k * K1
    ha[2] = t0 - RAn[2] + k * K1 + K1
    ha[1] = (ha[2] + ha[0]) / 2 // hour angle at half hour
    Dec[1] = (Dec[2] + Dec[0]) / 2 // declination at half hour
    s = Math.sin(lat * DR)
    c = Math.cos(lat * DR)
    z = Math.cos(90.833 * DR) // refraction + sun semidiameter at horizon
    if (k <= 0) VHz[0] = s * Math.sin(Dec[0]) + c * Math.cos(Dec[0]) * Math.cos(ha[0]) - z
    VHz[2] = s * Math.sin(Dec[2]) + c * Math.cos(Dec[2]) * Math.cos(ha[2]) - z
    if (sgn(VHz[0]) == sgn(VHz[2])) return VHz[2] // no event this hour
    VHz[1] = s * Math.sin(Dec[1]) + c * Math.cos(Dec[1]) * Math.cos(ha[1]) - z
    a = 2 * VHz[0] - 4 * VHz[1] + 2 * VHz[2]
    b = -3 * VHz[0] + 4 * VHz[1] - VHz[2]
    d = b * b - 4 * a * VHz[0]
    if (d < 0) return VHz[2] // no event this hour
    d = Math.sqrt(d)
    e = (-b + d) / (2 * a)
    if (e > 1 || e < 0) e = (-b - d) / (2 * a)
    time = k + e + 1 / 120 // time of an event
    hr = Math.floor(time)
    min = Math.floor((time - hr) * 60)
    hz = ha[0] + e * (ha[2] - ha[0]) // azimuth of the sun at the event
    nz = -Math.cos(Dec[1]) * Math.sin(hz)
    dz = c * Math.sin(Dec[1]) - s * Math.cos(Dec[1]) * Math.cos(hz)
    az = Math.atan2(nz, dz) / DR
    if (az < 0) az = az + 360
    if (VHz[0] < 0 && VHz[2] > 0) {
      Rise_time[0] = hr
      Rise_time[1] = min
      Sunrise = true
    }
    if (VHz[0] > 0 && VHz[2] < 0) {
      Set_time[0] = hr
      Set_time[1] = min
      Sunset = true
    }
    return VHz[2]
  }

  // sun's position using fundamental arguments
  // (Van Flandern & Pulkkinen, 1979)
  const sun = (jd: number, ct: number) => {
    let g, lo, s, u, v, w
    lo = 0.779072 + 0.00273790931 * jd
    lo = lo - Math.floor(lo)
    lo = lo * 2 * PI
    g = 0.993126 + 0.0027377785 * jd
    g = g - Math.floor(g)
    g = g * 2 * PI
    v = 0.39785 * Math.sin(lo)
    v = v - 0.01 * Math.sin(lo - g)
    v = v + 0.00333 * Math.sin(lo + g)
    v = v - 0.00021 * ct * Math.sin(lo)
    u = 1 - 0.03349 * Math.cos(g)
    u = u - 0.00014 * Math.cos(2 * lo)
    u = u + 0.00008 * Math.cos(lo)
    w = -0.0001 - 0.04129 * Math.sin(2 * lo)
    w = w + 0.03211 * Math.sin(g)
    w = w + 0.00104 * Math.sin(2 * lo - g)
    w = w - 0.00035 * Math.sin(2 * lo + g)
    w = w - 0.00008 * ct * Math.sin(g)
    s = w / Math.sqrt(u - v * v) // compute sun's right ascension
    Sky[0] = lo + Math.atan(s / Math.sqrt(1 - s * s))
    s = v / Math.sqrt(u) // ...and declination
    Sky[1] = Math.atan(s / Math.sqrt(1 - s * s))
  }

  // The wall-clock date/time as it appears in the requested timezone: shift
  // the instant by its UTC offset, then read it back with UTC getters. This
  // avoids ever touching the host machine's own local timezone.
  const local = new Date(d.getTime() - offsetMinutes * 60000)

  const zone = Math.round(offsetMinutes / 60)
  let jd = julian_day(local) - 2451545 // Julian day relative to Jan 1.5, 2000

  if (sgn(zone) === sgn(lon) && zone) {
    // return {
    //     error: "Invalid input data."
    // }
  }

  lon = lon / 360
  const tz = zone / 24

  // centuries since 1900.0
  const ct = jd / 36525 + 1

  // local sidereal time
  const t0 = lst(lon, jd, tz)

  // get sun position at start of day
  jd += tz

  sun(jd, ct)

  const ra0 = Sky[0]
  const dec0 = Sky[1]

  // get sun position at end of day
  ++jd

  sun(jd, ct)
  let ra1 = Sky[0]
  const dec1 = Sky[1]

  // make continuous
  if (ra1 < ra0) {
    ra1 += 2 * PI
  }

  RAn[0] = ra0
  Dec[0] = dec0

  // check each hour of this day
  for (let k = 0; k < 24; ++k) {
    // const ph = (k + 1) / 24
    RAn[2] = ra0 + ((k + 1) * (ra1 - ra0)) / 24
    Dec[2] = dec0 + ((k + 1) * (dec1 - dec0)) / 24
    VHz[2] = test_hour(k, t0, lat)

    // advance to next hour
    RAn[0] = RAn[2]
    Dec[0] = Dec[2]
    VHz[0] = VHz[2]
  }

  // Rise_time/Set_time are wall-clock hour/minute on `local`'s calendar day.
  // Build them as UTC, then shift back by the same offset to get the true
  // (host-timezone-independent) instant.
  const zonedDate = (hour: number, minute: number) =>
    new Date(
      Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hour, minute, 0) +
        offsetMinutes * 60000,
    )

  // After the 24-hour loop VHz[2] holds the sun's altitude at the end of the
  // day. When neither event fired, its sign tells the two polar cases apart.
  const polar: SundownResult['polar'] = !Sunrise && !Sunset ? (VHz[2] >= 0 ? 'day' : 'night') : null

  if (polar === 'day') {
    // Light all day: span the whole local day rather than leaving both
    // times at midnight, which would read as a zero-length day.
    Rise_time[0] = 0
    Rise_time[1] = 0
    Set_time[0] = 24
    Set_time[1] = 0
  } else if (Sunrise && !Sunset) {
    // The sun rose today but sets after local midnight.
    Set_time[0] = 24
    Set_time[1] = 0
  }
  // The remaining cases already work with Rise_time/Set_time left at
  // midnight: a polar night is a zero-length day, and a sun that only sets
  // today was already up when the day began.

  const sunriseTime = zonedDate(Rise_time[0], Rise_time[1])
  let sunsetTime = zonedDate(Set_time[0], Set_time[1])

  // Both events are found by scanning one local calendar day, so at high
  // latitudes in summer -- where the sun sets after midnight and rises again
  // an hour or two later -- the sunset found on that day belongs to the night
  // that began the day before, and lands *before* the sunrise. Left alone,
  // `date > sunset` then reads as night at local noon. The sunset that
  // follows this sunrise is the one a day later.
  if (sunsetTime < sunriseTime) {
    sunsetTime = new Date(sunsetTime.getTime() + 24 * 60 * 60 * 1000)
  }

  return {
    sunrise: sunriseTime,
    sunset: sunsetTime,
    polar,
  }
}
