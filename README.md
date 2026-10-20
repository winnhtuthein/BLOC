# BLOC

A daily planner that keeps tasks, focus blocks, habits and your calendar in one place.

**Live:** [yitbloc.site](https://yitbloc.site)

<!-- Add a screenshot: save it as docs/screenshot.png in this repo, then replace this line with:
![BLOC](docs/screenshot.png) -->

## What it does

- **Tasks** with priority and energy levels, sorting, and a smart "what should I do first" pick
- **Focus blocks** with a Pomodoro-style timer
- **Habits** with history and onboarding
- **Calendar** with a day bar and events
- **Weekly planning and review**, plus short daily reflections
- **Energy check-in** at the start of the day
- **Optional AI helper** that can connect to Gemini, OpenAI, or a local Ollama model
- Accounts and sync through a small API. Free during the early-access beta.

## Built with

- Plain HTML, CSS and JavaScript. No framework.
- esbuild for concatenating and minifying, with content-hashed asset names
- Vercel for hosting, with security headers (CSP, frame, referrer, permissions) set in `vercel.json`
- Supabase for the founding-member list (`backend/`)

## How it's organised

```
src/
  index.html      markup; asset URLs are rewritten with content hashes at build time
  css/NN-*.css    concatenated in filename order (order is the cascade)
  js/NN-*.js      classic scripts, concatenated in filename order
  vendor/         third-party code (ollama-js, MIT)
  static/         copied as-is to public/ (guides, robots.txt, sitemap, images)
scripts/build.mjs src/ -> public/
backend/          Supabase migration for the founding-member list
```

## Run it

```
npm install
npm run dev      # unminified build
npm run build    # production build into public/
```

Edit `src/` only. `public/` is generated on every build.

## Known debt

- About 280 inline `onclick` and `oninput` handlers remain, so the CSP still allows `'unsafe-inline'` scripts.
- About 110 `!important` rules left over from stacked stylesheet layers.
- `01-core.js` is one 700 KB file that should be split by feature.

## License

Copyright (c) 2026 winnhtuthein. All rights reserved. The source is public so you can see how it was built, not for reuse.
