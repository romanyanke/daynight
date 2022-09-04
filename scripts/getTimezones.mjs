import fs from 'fs'
import combined from './combined.json' assert { type: 'json' }
import GeoJSONReader from 'jsts/org/locationtech/jts/io/GeoJSONReader.js'
import Centroid from 'jsts/org/locationtech/jts/algorithm/Centroid.js'

const cachePath = 'scripts/cached.json'

async function getCached() {
  return await (
    await import('./cached.json', { assert: { type: 'json' } })
  ).default
}

function getGenerated() {
  const geoJsonReader = new GeoJSONReader()
  const round = n => Math.round(n * 100) / 100

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
    console.log('Use cached file')
    return cached
  } catch (e) {
    const result = getGenerated()
    fs.writeFileSync(cachePath, JSON.stringify(result), 'utf-8')

    return result
  }
}
