import fs from 'fs'
import GeoJSONReader from 'jsts/org/locationtech/jts/io/GeoJSONReader.js'
import InteriorPointArea from 'jsts/org/locationtech/jts/algorithm/InteriorPointArea.js'

const cachePath = 'scripts/cached.json'

// Read these with fs rather than a JSON import: the `assert { type: 'json' }`
// syntax was dropped in Node 22 (it is `with` now), which made every import
// here throw and the error be reported as a missing combined.json. Reading
// the file directly sidesteps the syntax churn, and combined.json is ~160MB,
// which is better handled by a plain read than the module loader.
const readJSON = path => JSON.parse(fs.readFileSync(path, 'utf-8'))

async function getCombined() {
  return readJSON('scripts/combined.json')
}

async function getCached() {
  return readJSON(cachePath)
}

async function getTimezoneCenterPoints() {
  const geoJsonReader = new GeoJSONReader()
  const round = n => Math.round(n * 10) / 10

  let combined
  try {
    combined = await getCombined()
  } catch (e) {
    const help = fs.readFileSync('./scripts/README.md', 'utf-8')
    console.error(help)
    throw new Error('combined.json not found')
  }

  // A zone's geometry is often a MultiPolygon whose parts are far apart --
  // Australia/Perth owns an Antarctic claim, America/Argentina/Ushuaia
  // reaches towards the pole. Averaging all of them (Centroid of the whole
  // MultiPolygon, which is what this used to do) drags the result into open
  // ocean: Perth came out at [133.5, -64.6] instead of roughly [115.9, -32],
  // which is a badly wrong sunrise for everyone living there.
  //
  // Take the largest part instead, and pick a point guaranteed to lie inside
  // it rather than its centre of mass, which for a crescent-shaped zone can
  // itself fall outside the zone.
  //
  // Picking the largest part alone is not enough: an Antarctic claim is
  // usually the *biggest* piece a zone owns (the Australian Antarctic
  // Territory keeps Perth's time and dwarfs Western Australia), which moves
  // Perth from bad to worse. Those sectors have no permanent population, so
  // for zones outside Antarctica/* drop the parts that lie entirely below
  // 60S before comparing, and fall back to the raw comparison if that would
  // leave nothing.
  const ANTARCTIC_LIMIT = -60

  const isAntarcticClaim = part => part.getEnvelopeInternal().getMaxY() <= ANTARCTIC_LIMIT

  const representativePart = (geometry, timezoneName) => {
    const parts = []
    for (let i = 0; i < geometry.getNumGeometries(); i++) parts.push(geometry.getGeometryN(i))

    const candidates = timezoneName.startsWith('Antarctica/')
      ? parts
      : parts.filter(part => !isAntarcticClaim(part))

    return (candidates.length ? candidates : parts).reduce((largest, part) =>
      part.getArea() > largest.getArea() ? part : largest,
    )
  }

  return combined.features.reduce((acc, feature) => {
    const timezoneName = feature.properties.tzid
    const geometry = geoJsonReader.read(JSON.stringify(feature.geometry))
    const { x, y } = InteriorPointArea.getInteriorPoint(representativePart(geometry, timezoneName))

    acc[timezoneName] = [x, y].map(round)
    return acc
  }, {})
}

export default async function () {
  try {
    const cached = await getCached()
    console.log('Use cached file of timezone center points')
    return cached
  } catch (e) {
    try {
      console.log('Calculating new file of timezone center points')
      const result = await getTimezoneCenterPoints()
      fs.writeFileSync(cachePath, JSON.stringify(result), 'utf-8')
      // Without this the first run (the one that has no cache yet) hands back
      // undefined, and generate.mjs dies on Object.entries(undefined). It
      // only ever worked when run twice.
      return result
    } catch (e) {
      console.error(e)
    }
  }
}
