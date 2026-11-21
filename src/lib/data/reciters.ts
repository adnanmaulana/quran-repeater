import type { Ref } from './quran';

export type ReciterStyle = 'murattal' | 'mujawwad';
export type Reciter = {
	id: string;
	name: string;
	style: ReciterStyle;
	/** Folder under https://everyayah.com/data/ (checked against recitations.js on 2026-11-21). */
	folder: string;
	kbps: number;
};

// A curated list: each folder serves one file per ayah with open CORS, which offline caching needs.
export const RECITERS: Reciter[] = [
	{ id: 'alafasy', name: 'Mishary Rashid Alafasy', style: 'murattal', folder: 'Alafasy_128kbps', kbps: 128 },
	{ id: 'husary', name: 'Mahmoud Khalil Al-Husary', style: 'murattal', folder: 'Husary_128kbps', kbps: 128 },
	{ id: 'abdulbasit-mujawwad', name: 'Abdul Basit Abdul Samad', style: 'mujawwad', folder: 'Abdul_Basit_Mujawwad_128kbps', kbps: 128 },
	{ id: 'minshawi', name: 'Muhammad Siddiq Al-Minshawi', style: 'murattal', folder: 'Minshawy_Murattal_128kbps', kbps: 128 },
	{ id: 'ghamdi', name: 'Saad Al-Ghamdi', style: 'murattal', folder: 'Ghamadi_40kbps', kbps: 40 },
	{ id: 'muaiqly', name: 'Maher Al-Muaiqly', style: 'murattal', folder: 'MaherAlMuaiqly128kbps', kbps: 128 },
	{ id: 'shatri', name: 'Abu Bakr Ash-Shatri', style: 'murattal', folder: 'Abu_Bakr_Ash-Shaatree_128kbps', kbps: 128 },
	{ id: 'rifai', name: 'Hani Ar-Rifai', style: 'murattal', folder: 'Hani_Rifai_192kbps', kbps: 192 }
];

export const DEFAULT_RECITER = 'alafasy';

export function reciter(id: string): Reciter {
	return RECITERS.find((r) => r.id === id) ?? RECITERS[0];
}

const pad = (n: number) => String(n).padStart(3, '0');

export function audioUrl(reciterId: string, ref: Ref): string {
	return `https://everyayah.com/data/${reciter(reciterId).folder}/${pad(ref.s)}${pad(ref.a)}.mp3`;
}

export function initials(name: string): string {
	return name
		.split(/\s+/)
		.filter((w) => /^[A-Z]/.test(w))
		.slice(0, 2)
		.map((w) => w[0])
		.join('');
}
