# BLOC

Daily planner: tasks, focus blocks, habits, calendar, notes. Static front end (no framework) plus a small
sync API (`backend/`).

## Layout

```
src/
  index.html        markup only; asset URLs are rewritten with content hashes at build time
  css/NN-*.css      concatenated in filename order. Order is the cascade, so renumber with care
  js/NN-*.js        classic scripts, concatenated in filename order (01-core.js defines the globals
                    that inline handlers call; every later file is an IIFE)
  vendor/           third-party code kept out of the app bundle (ollama-js, MIT)
  static/           copied as-is to public/ (og.png, robots.txt, sitemap.xml, vendor licence)
scripts/build.mjs   src/ -> public/ (concat + esbuild minify + hashed file names)
vercel.json         build settings, security headers, long-lived cache for /assets
backend/            Supabase migration and notes for the founding-member list
```

## Develop

```
npm install
npm run dev      # unminified build, readable stack traces
npm run build    # production build into public/
```

Edit files in `src/` only. `public/` is generated. There are no patch scripts any more: change the
rule or function where it lives instead of adding a layer on top.

## Deploy (Vercel)

`vercel.json` runs `npm run build` and serves `public/`. Headers (CSP, frame, referrer, permissions) come
from the same file. If you add a new third-party origin (analytics, fonts, API), add it to the matching
`Content-Security-Policy` directive or the browser will block it.

## Known debt

- Inline `onclick`/`oninput` attributes remain (about 280 in the markup, more in JS templates), which is why
  `script-src` still needs `'unsafe-inline'`. Moving them to `addEventListener` would let the CSP drop it.
- `!important` appears about 110 times. They are override fights between the old stylesheet layers
  (`02-` to `21-`) and the base sheet; removing them requires merging those layers into the base rules.
- `01-core.js` is a single 700 KB file. Split by feature when you next touch each area.
