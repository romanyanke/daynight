import fs from 'fs'
import GeoJSONReader from 'jsts/org/locationtech/jts/io/GeoJSONReader.js'
import Centroid from 'jsts/org/locationtech/jts/algorithm/Centroid.js'

const cachePath = 'scripts/cached.json'

async function getCombined() {
  return await (
    await import('./combined.json', { assert: { type: 'json' } })
  ).default
}

async function getCached() {
  return await (
    await import('./cached.json', { assert: { type: 'json' } })
  ).default
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

  return combined.features.reduce((acc, feature) => {
    const timezoneName = feature.properties.tzid
    const geometry = geoJsonReader.read(JSON.stringify(feature.geometry))
    const centroid = new Centroid(geometry)
    const { x, y } = centroid.getCentroid()

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
    } catch (e) {
      console.error(e)
    }
  }
}
