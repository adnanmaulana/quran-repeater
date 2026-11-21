import { juz, surah } from '#lib/data/quran.js';
import { m } from '#lib/paraglide/messages.js';
import { itemAyat, itemTitle, type Item } from '#lib/repeat/types.js';

/** Count phrases with English singulars ("1 ayah", "1 item"); Indonesian uses one form. */
export const count = {
	ayat: (n: number) => (n === 1 ? m.ayah_one({ count: n }) : m.ayat_count({ count: n })),
	items: (n: number) => (n === 1 ? m.items_one({ count: n }) : m.items_other({ count: n })),
	plays: (n: number) => (n === 1 ? m.plays_one({ count: n }) : m.plays_other({ count: n }))
};

const juzLabel = (n: number) => m.juz_label({ n });

export function title(item: Item): string {
	return itemTitle(item, juzLabel);
}

/** Second line under an item: what it covers and how many ayat. */
export function detail(item: Item): string {
	const ayat = count.ayat(itemAyat(item));
	if (item.source.kind === 'surah') return `${m.whole_surah()} · ${ayat}`;
	if (item.source.kind === 'juz') {
		const j = juz(item.source.n);
		return `${surah(j.start.s).name} ${j.start.a} – ${surah(j.end.s).name} ${j.end.a} · ${ayat}`;
	}
	return ayat;
}
