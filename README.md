# Quran Repeater

Repeat the Quran by surah, juz, custom ayah range, or a playlist of several — with the reciter of
your choice, in the background, and offline. Mobile-first and installable as a PWA.
English and Bahasa Indonesia.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
npm run check      # type-check
npm test           # unit tests (Vitest)
npm run test:e2e   # browser tests (Playwright, builds and serves the app)
npm run build      # static output in build/
```

Text and metadata come from [AlQuran.cloud](https://alquran.cloud/api); audio from
[EveryAyah](https://everyayah.com). See [PLAN.md](PLAN.md) for the architecture and roadmap.
