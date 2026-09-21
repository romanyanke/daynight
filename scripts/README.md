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

## generate-og.mjs

Renders `demo/src/og.png`, the 1200x600 card social networks show when the
demo is linked. The page draws its map in the browser and a preview crawler
never runs that, so the card has to be a still.

Run `npm run generate:og`. It needs `dist/` built first (`npm run build`),
because it calls the library itself rather than reimplementing it.

## generate-hero.mjs

Renders `assets/hero.gif`, the spinning globe at the top of the README.
GitHub strips `<script>`, `<canvas>` and `<iframe>` out of markdown, so the
interactive demo cannot be embedded -- an animated GIF linking to it is as
close as the format allows.

Run `npm run generate:hero`, again after `npm run build`. Over one loop the
globe turns once while two days pass, so the terminator makes a full sweep
over the ground and every zone dot goes from night to day and back. The loop
starts at the June solstice on purpose: the sun's declination is at its
extreme there and barely moves across the two days, so the last frame lines up
with the first instead of jumping.

Both generators share `render-shared.mjs` -- one palette, one solar model, one
land parser -- so the card and the globe cannot drift apart. Both write their
image formats by hand (`zlib` for PNG, a small LZW coder for GIF) rather than
pulling in an image library, for the same reason the package itself has no
runtime dependencies.
