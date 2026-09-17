// Equirectangular (plate carrée) projection: longitude and latitude map
// linearly onto x and y. Both the timezone dots and the generated land
// outline go through this one function, so they cannot drift apart --
// scripts/generate-land.mjs imports this very file rather than
// reimplementing the maths.
//
// The viewBox is in tenths of a degree, matching how timeZones.ts quantizes
// its coordinates, which keeps the generated path free of decimal points.
export const VIEW = {
  width: 3600,
  height: 1800,
  lonMin: -180,
  lonMax: 180,
  latMin: -90,
  latMax: 90,
} as const

export const project = (lon: number, lat: number): [number, number] => [
  ((lon - VIEW.lonMin) / (VIEW.lonMax - VIEW.lonMin)) * VIEW.width,
  ((VIEW.latMax - lat) / (VIEW.latMax - VIEW.latMin)) * VIEW.height,
]

// The globe. Orthographic projection: the world as seen from infinitely far
// away, which is what makes it read as a ball rather than a fisheye photo.
//
// `rotation` is the point facing the viewer. Everything else -- the coastline,
// the dots, the night shading -- goes through `orthographic` with the same
// rotation, so no layer can drift away from another.
export interface Rotation {
  /** Longitude facing the viewer, degrees. */
  lon: number
  /** Latitude facing the viewer, degrees. */
  lat: number
}

const DEG = Math.PI / 180

/**
 * Projects a point onto the unit disc as seen from `rotation`.
 *
 * Returns x and y in -1..1 (y up, the maths convention -- screens flip it) and
 * z, which is positive on the near half of the globe and negative on the far
 * half. Callers use z to decide what is visible; for the night shading it is
 * also exactly the cosine they need.
 */
export const orthographic = (
  lon: number,
  lat: number,
  rotation: Rotation,
): [number, number, number] => {
  const phi = lat * DEG
  const lambda = (lon - rotation.lon) * DEG
  const phi0 = rotation.lat * DEG

  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)
  const cosLambda = Math.cos(lambda)

  return [
    cosPhi * Math.sin(lambda),
    Math.cos(phi0) * sinPhi - Math.sin(phi0) * cosPhi * cosLambda,
    Math.sin(phi0) * sinPhi + Math.cos(phi0) * cosPhi * cosLambda,
  ]
}

/**
 * A projector bound to one rotation. The viewer's latitude only enters the
 * maths through its sine and cosine, so binding it once keeps the per-vertex
 * cost to the vertex's own trigonometry -- which matters when a drag
 * reprojects the whole coastline every frame.
 *
 * Writes into `out` rather than allocating: called a couple of thousand times
 * a frame, a returned tuple each time is pure garbage.
 */
export const projector = (rotation: Rotation) => {
  const phi0 = rotation.lat * DEG
  const sin0 = Math.sin(phi0)
  const cos0 = Math.cos(phi0)

  return (lon: number, lat: number, out: Float64Array | number[]) => {
    const phi = lat * DEG
    const lambda = (lon - rotation.lon) * DEG

    const cosPhi = Math.cos(phi)
    const sinPhi = Math.sin(phi)
    const cosLambda = Math.cos(lambda)

    out[0] = cosPhi * Math.sin(lambda)
    out[1] = cos0 * sinPhi - sin0 * cosPhi * cosLambda
    out[2] = sin0 * sinPhi + cos0 * cosPhi * cosLambda
  }
}
