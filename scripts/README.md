This program calculates the center coordinates for all time zones.
It relies on the information at https://github.com/evansiroky/timezone-boundary-builder.
Check out the latest releases at https://github.com/evansiroky/timezone-boundary-builder/releases.
Download the timezones.geojson.zip file
Put its content into this folder (so `import('./combined.json')` works)
Run `npm run generate`

`generate.mjs` writes `src/timeZones.ts` (capital `Z` — must match the `./timeZones`
import in `src/daynight.ts`, or generation silently stops updating the module used
at runtime on case-sensitive filesystems). Coordinates are stored as integer
degrees ×10 (e.g. `-603` for `-60.3°`) rather than one-decimal floats, to keep the
file small both raw and gzip/brotli-compressed; `src/daynight.ts` divides by 10 on
read.

## generate-land.mjs

Builds the demo's world map outline (`demo/src/map/land.ts`) from Natural
Earth's 110m land polygons, which are public domain.

Download `ne_110m_land.geojson` into this folder:

    curl -O https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson

Then run `npm run generate:land`.

The outline is projected with `demo/src/map/projection.ts` -- the same module
the page uses to place its timezone dots -- so the two cannot drift apart. The
generated file records the projection it was built with, and the demo asserts
it still matches at startup.

## generate-zones.mjs

Writes `demo/src/map/zones.ts`, the list of zone names the demo plots, from
the committed `src/timeZones.ts`. Needs no download, so `npm run
generate:zones` can be run any time -- and should be, after regenerating the
coordinate table.
