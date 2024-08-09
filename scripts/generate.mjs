import getTimezones from './getTimezones.mjs'
import fs from 'fs'

try {
  const result = {}

  const data = await getTimezones()

  for (const [name, coordinates] of Object.entries(data)) {
    const paths = name.split('/')
    let current = result
    for (const [index, path] of paths.entries()) {
      const isLast = index === paths.length - 1
      if (isLast) {
        current[path] = coordinates
        break
      }
      if (!current[path]) {
        current[path] = {}
      }
      current = current[path]
    }
    current = coordinates
  }

  fs.writeFileSync(
    'src/timezones.ts',
    `export const timezones = JSON.parse('${JSON.stringify(result)}')`,
  )

  console.log('Generated src/timezones.ts')
} catch (e) {
  console.error(e)
}
