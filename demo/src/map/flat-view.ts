// The flat view: the same world as an equirectangular map. Land as one SVG
// path, the night shaded on a canvas over it, dots on top -- the arrangement
// the page had before the globe, kept because a rectangle shows every zone at
// once, which a ball cannot.
import { VIEW, project } from './projection'
import { LAND_PATH, LAND_VIEW } from './land'
import { createTerminator } from './terminator'
import { createDots } from './dots'
import { ZoneState } from './zone-state'
import { WorldView } from './globe-view'

const svgNS = 'http://www.w3.org/2000/svg'

export const createFlatView = (state: ZoneState): WorldView => {
  // The land outline is generated against the projection in projection.ts.
  // If someone changes the viewBox without regenerating, the coastline would
  // drift out from under the dots -- silently, and only visibly wrong in
  // places nobody looks. Fail loudly instead.
  if (LAND_VIEW.width !== VIEW.width || LAND_VIEW.height !== VIEW.height) {
    throw new Error('land.ts was generated for a different projection; run `npm run generate:land`')
  }

  const element = document.createElement('div')
  element.className = 'map map--flat'

  const land = document.createElementNS(svgNS, 'svg')
  land.setAttribute('viewBox', `0 0 ${VIEW.width} ${VIEW.height}`)
  land.setAttribute('class', 'map__land')
  land.setAttribute('aria-hidden', 'true')
  const path = document.createElementNS(svgNS, 'path')
  path.setAttribute('d', LAND_PATH)
  land.append(path)
  element.append(land)

  // Land first, then the night over the top of it. The other way round left
  // the continents fully lit at midnight -- the shadow only ever fell on the
  // sea -- which is exactly backwards from what the map is claiming.
  const terminator = createTerminator()
  element.append(terminator.element)

  const dots = createDots(state, VIEW, (zone, out) => {
    const [x, y] = project(zone.lon, zone.lat)
    out[0] = x
    out[1] = y
    // Every zone is in view on a flat map: that is the point of it.
    return true
  })

  element.append(dots.element)

  return {
    element,
    dots,
    name: 'flat',
    frontRole: { role: 'img', label: 'Flat map of every timezone, lit by day and dark by night.' },
    pipLabel: 'Show the flat map',
    render(date) {
      terminator.draw(date)
      dots.place()
    },
    invalidate() {},
    // Nothing on this canvas is a theme colour: the night is the same shade of
    // dark whichever theme the page is in.
    refreshColours() {},
    // A flat map shows everywhere at once; there is nothing to turn towards.
    focus() {},
  }
}
