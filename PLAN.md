# Quran Repeater — build plan

A mobile-first, installable web app (PWA) for repeating the Quran by surah, juz, custom ayah
ranges, or playlists of several of them. Audio keeps playing with the screen locked, and history,
playlists and settings stay on the device.

## Stack

| Concern | Choice |
|---|---|
| Framework | Svelte 5 (runes) + SvelteKit 3, `adapter-static`, SPA fallback, SSR off |
| Styling | Plain CSS with design tokens (`src/lib/design/tokens.css`) |
| Fonts | Self-hosted via Fontsource: Inter (UI), Amiri (Arabic), split by unicode-range |
| i18n | Paraglide JS (compiled, tree-shaken) — English + Bahasa Indonesia |
| State | Svelte runes + a small `persisted()` helper for localStorage |
| Cache | IndexedDB (`idb-keyval`) for surah text and the download index |
| PWA | SvelteKit's built-in service worker (`src/service-worker/`), no Workbox |
| Tests | Vitest (logic), Playwright (flows) |

## Data sources (checked 2026-11-21)

- **Text + metadata:** AlQuran.cloud — `GET https://api.alquran.cloud/v1/surah/{n}/editions/quran-uthmani,en.sahih,id.indonesian`.
  CORS is open. In `quran-uthmani`, ayah 1 of every surah except 1 has the Basmalah prefixed:
  strip it for display.
- **Audio:** EveryAyah — `https://everyayah.com/data/{folder}/{SSS}{AAA}.mp3`. CORS `*` and range
  requests work, so files can be cached for offline playback. (`cdn.islamic.network` sends no CORS
  header, so it is not used.) Ayah-1 files do not include the Basmalah; the player plays `001001`
  before ayah 1 of every surah except 1 and 9.
- **Word timings:** Quran.com — `GET https://api.quran.com/api/v4/recitations/{id}/by_chapter/{n}?fields=segments`.
  Segments are `[segment, word (1-based), start ms, end ms]` and may repeat words. Its files are
  byte-identical to EveryAyah's for 6 of our reciters (`timingsId` in `reciters.ts`); Ghamdi and
  Muaiqly have none, so their lines advance on an estimate and words are not coloured. Word numbers
  match `quran-uthmani` once pause marks join the word before and ۞ the word after (37:130 aside).
- **Bundled:** `src/lib/data/surahs.json` and `juz.json`, generated once by
  `scripts/generate-metadata.mjs`, so lists render with no network call.

## Repeat model

```ts
type Item = { start: { s: number; a: number }; end: { s: number; a: number }; loops: number };
type RepeatConfig = {
  items: Item[]; perAyah: number; listLoops: number | 'infinite';
  gapMs: number; speed: number; reciterId: string;
};
// queue: list loop → item → item loop → ayah → ayah repeat
```

A whole surah, a juz, a custom range and a range across surahs are all just `Item`s.

## Screens (from the design canvas)

Home (Surah / Juz / Custom + multi-select) · Repeat setup (playlist) · Now playing ·
Choose reciter · History · Playlists · Download sheet · Settings.
Addition not on the canvas: a mini player above the bottom nav while audio plays.

## Performance budgets

- Initial JS < 60 KB gzipped (before fonts)
- LCP < 1.5 s on a mid-range Android phone over 4G
- Lighthouse Performance and PWA ≥ 95

Rules: the audio engine is a plain TS class outside the UI; the progress bar moves with
`requestAnimationFrame`; the next ayah is prefetched; never render a whole juz of Arabic text;
code is split per route.

## Phases

| # | Phase | Done when |
|---|---|---|
| 1 | Scaffold, tokens + fonts, icons, base components, bottom nav, EN/ID, bundled metadata | Home matches the canvas in EN and ID; tabs and multi-select work |
| 2 | Queue builder (unit-tested), Setup screen, playlist editing with drag reorder | The plays total matches the queue builder's count |
| 3 | Audio engine, Now playing, mini player, Media Session | Al-Mulk 1–3 ×3 plays correctly with the screen locked, on an installed iPhone app and Android |
| 4 | PWA install, offline caching, download sheet (all 4 states) | A downloaded playlist plays in airplane mode |
| 5 | History + resume, saved playlists, reciters with preview, settings | Reopening the app resumes at the same ayah and repeat |
| 6 | Wider layout, dark theme, accessibility, Lighthouse, deploy | Lighthouse ≥ 95, deployed |

## Offline

- The service worker precaches the app shell per version and serves pages network-first with a
  3 s fallback to the cached app.
- Downloads go to the `qr-audio-v1` cache; the service worker serves EveryAyah requests from it,
  answering HTTP Range requests with 206 (iOS Safari needs this for media).
- Surah text and word timings are kept in IndexedDB; a download also saves both for its surahs.

## Open checks

- Background playback on a real iPhone (installed PWA) — Phase 3 gate.
- Indonesian copy needs a native-speaker review.
