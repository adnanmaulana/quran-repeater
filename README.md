# Quran Repeater

Repeat the Quran by surah, juz, custom ayah range, or a playlist of several — with the reciter of
your choice, in the background, and offline. Mobile-first, installable as a PWA, in English and
Bahasa Indonesia.

## Features

- **Pick what to repeat:** surah, juz, custom ranges (across surahs), or several at once
- **Repeat setup:** times per ayah, per item and for the whole list (or forever), pause between
  repeats, speed, reciter; drag to reorder
- **Player:** Arabic with translation, one line at a time with words coloured as they are recited,
  lock-screen controls, sleep timer, mini player while you browse
- **Offline:** download a playlist's audio and text; plays in airplane mode
- **History and playlists:** every session is saved and resumes at the same ayah and repeat; save
  repeats as named playlists
- **8 reciters** with previews; Sahih International or Kemenag translation
- **Light and dark themes**, three Arabic text sizes, phone and wide-screen layouts

Everything is stored on the device (localStorage, IndexedDB, Cache Storage); there is no account
or server.

## Develop

```sh
npm install
npm run dev         # http://localhost:5173
npm run check       # type-check (app + service worker)
npm test            # unit tests (Vitest), including colour contrast checks
npm run test:e2e    # browser tests (Playwright; builds and serves the app), including axe audits
npm run build       # static output in build/
```

`E2E_PORT=4174 npm run test:e2e` runs the browser tests on another port, e.g. from a second git
worktree. Generated assets: `npm run gen:meta` (surah/juz data), `npm run gen:icons` (app icons),
`npm run gen:fonts` (copies the web fonts to `static/fonts/`).

## Deploy

The app is a static site. On Vercel, importing the repository is enough: `vercel.json` sets the
build, the SPA fallback and caching headers. Every push to `main` deploys; pull requests get
preview URLs. CI (GitHub Actions) runs the type-check, unit tests, build and browser tests.

## Data sources

Text from [AlQuran.cloud](https://alquran.cloud/api), audio from [EveryAyah](https://everyayah.com),
surah names and word timings from [Quran.com](https://api-docs.quran.com). See [PLAN.md](PLAN.md)
for the architecture and decisions.
