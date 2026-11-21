// Generates the bundled Quran metadata in src/lib/data/.
// Run once (or when the sources change): `npm run gen:meta`.
//
// - Surah names, Arabic names, meanings (EN/ID), revelation place and ayah counts: Quran.com API v4.
// - Juz boundaries: AlQuran.cloud /v1/meta.
// The two ayah counts are cross-checked, and the total must be 6236.
import { writeFile } from 'node:fs/promises';

const OUT = new URL('../src/lib/data/', import.meta.url);

async function json(url) {
	const res = await fetch(url, { headers: { 'User-Agent': 'quran-repeater-metadata-script' } });
	if (!res.ok) throw new Error(`${url} → ${res.status}`);
	return res.json();
}

const [en, id, meta] = await Promise.all([
	json('https://api.quran.com/api/v4/chapters?language=en'),
	json('https://api.quran.com/api/v4/chapters?language=id'),
	json('https://api.alquran.cloud/v1/meta')
]);

const idById = new Map(id.chapters.map((c) => [c.id, c.translated_name.name]));
const cloudCounts = meta.data.surahs.references.map((s) => s.numberOfAyahs);

const surahs = en.chapters.map((c) => {
	if (cloudCounts[c.id - 1] !== c.verses_count) {
		throw new Error(`Ayah count mismatch for surah ${c.id}`);
	}
	return {
		n: c.id,
		name: c.name_simple,
		ar: c.name_arabic,
		meaning: { en: c.translated_name.name, id: idById.get(c.id) },
		place: c.revelation_place === 'makkah' ? 'meccan' : 'medinan',
		ayat: c.verses_count
	};
});

const total = surahs.reduce((a, s) => a + s.ayat, 0);
if (surahs.length !== 114 || total !== 6236) throw new Error(`Unexpected totals: ${surahs.length} / ${total}`);

const starts = meta.data.juzs.references; // [{ surah, ayah }] × 30
const juz = starts.map((start, i) => {
	const next = starts[i + 1];
	const end = next
		? next.ayah > 1
			? { s: next.surah, a: next.ayah - 1 }
			: { s: next.surah - 1, a: surahs[next.surah - 2].ayat }
		: { s: 114, a: 6 };
	return { n: i + 1, start: { s: start.surah, a: start.ayah }, end };
});

await writeFile(new URL('surahs.json', OUT), JSON.stringify(surahs) + '\n');
await writeFile(new URL('juz.json', OUT), JSON.stringify(juz) + '\n');
console.log(`Wrote ${surahs.length} surahs (${total} ayat) and ${juz.length} juz.`);
