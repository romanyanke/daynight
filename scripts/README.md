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
