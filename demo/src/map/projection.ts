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
