import getTimezones from './getTimezones.mjs'
import fs from 'fs'

// Stores degrees * 10 as an integer instead of a one-decimal float (e.g. -603
// instead of -60.3). Divided back by 10 on read (src/daynight.ts). Measured to
// shrink both the raw file and its gzip/brotli size versus decimal floats,
// unlike a binary+base64 packing (which shrinks raw size but compresses worse
// than the repetitive decimal text, since base64 of packed bytes is close to
// random and gzip/brotli can't exploit it).
export function quantize([lon, lat]) {
  return [Math.round(lon * 10), Math.round(lat * 10)]
}

export function buildTimeZonesModuleSource(nestedData) {
  return `export const timezones = JSON.parse('${JSON.stringify(nestedData)}')\n`
}

try {
  const result = {}

  const data = await getTimezones()

  for (const [name, coordinates] of Object.entries(data)) {
    const paths = name.split('/')
    let current = result
    for (const [index, path] of paths.entries()) {
      const isLast = index === paths.length - 1
      if (isLast) {
        current[path] = quantize(coordinates)
        break
      }
      if (!current[path]) {
        current[path] = {}
      }
      current = current[path]
    }
  }

  fs.writeFileSync('src/timeZones.ts', buildTimeZonesModuleSource(result))

  console.log('Generated src/timeZones.ts')
} catch (e) {
  console.error(e)
}
