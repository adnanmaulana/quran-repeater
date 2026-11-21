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

/** "Al-Kahf" or "Al-Kahf + 2 more" for a whole playlist. */
export function playlistTitle(items: Item[]): string {
	if (!items.length) return '';
	const first = title(items[0]);
	return items.length > 1 ? m.title_more({ title: first, count: items.length - 1 }) : first;
}

/** "3× each · 2 loops" / "1× each · loop forever". */
export function repeatRule(perAyah: number, listLoops: number | 'infinite'): string {
	const loops = listLoops === 'infinite' ? m.loop_forever_short() : listLoops === 1 ? m.loops_one({ count: 1 }) : m.loops_other({ count: listLoops });
	return `${m.each_times({ n: perAyah })} · ${loops}`;
}
