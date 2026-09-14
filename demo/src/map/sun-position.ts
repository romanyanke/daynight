// Where the sun is directly overhead, for shading the map's night side.
//
// This is only for the backdrop: every statement the page actually makes
// about day or night comes from daynight() itself. The library does not
// export this part of its astronomy, and duplicating the whole of sun.ts to
// draw a gradient would be worse than these few lines.
export interface SubsolarPoint {
  /** Longitude where the sun is overhead, degrees. */
  lon: number
  /** Latitude where the sun is overhead (the solar declination), degrees. */
  lat: number
}

const DEG = Math.PI / 180

export const subsolarPoint = (date: Date): SubsolarPoint => {
  // Days since the J2000.0 epoch.
  const days = date.getTime() / 86400000 - 10957.5

  // Low-precision solar coordinates (good to a fraction of a degree, which is
  // far beyond what a screen-sized terminator can show).
  const meanLongitude = (280.46 + 0.9856474 * days) * DEG
  const meanAnomaly = (357.528 + 0.9856003 * days) * DEG
  const eclipticLongitude =
    meanLongitude + (1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * DEG

  const obliquity = (23.439 - 0.0000004 * days) * DEG
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude))

  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude),
  )

  // Greenwich mean sidereal time, in degrees.
  const gmst = 280.46061837 + 360.98564736629 * days

  const lon = ((((rightAscension / DEG - gmst) % 360) + 540) % 360) - 180

  return { lon, lat: declination / DEG }
}

/** Sine of the sun's altitude at a point -- positive where the sun is up. */
export const sunAltitudeSin = (lon: number, lat: number, sun: SubsolarPoint): number =>
  Math.sin(lat * DEG) * Math.sin(sun.lat * DEG) +
  Math.cos(lat * DEG) * Math.cos(sun.lat * DEG) * Math.cos((lon - sun.lon) * DEG)
