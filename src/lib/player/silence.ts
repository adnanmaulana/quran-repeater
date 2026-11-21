/**
 * A silent WAV of `ms` milliseconds (8 kHz, 8-bit mono: 8 KB per second).
 * Played through the same <audio> element for "pause between repeats", because timers are
 * throttled when the screen is locked but audio keeps going.
 */
export function silentWav(ms: number): Blob {
	const rate = 8000;
	const samples = Math.max(1, Math.round((rate * ms) / 1000));
	const buf = new ArrayBuffer(44 + samples);
	const v = new DataView(buf);
	const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
	str(0, 'RIFF');
	v.setUint32(4, 36 + samples, true);
	str(8, 'WAVE');
	str(12, 'fmt ');
	v.setUint32(16, 16, true); // PCM header size
	v.setUint16(20, 1, true); // PCM
	v.setUint16(22, 1, true); // mono
	v.setUint32(24, rate, true);
	v.setUint32(28, rate, true); // byte rate
	v.setUint16(32, 1, true); // block align
	v.setUint16(34, 8, true); // bits per sample
	str(36, 'data');
	v.setUint32(40, samples, true);
	new Uint8Array(buf, 44).fill(128); // 8-bit PCM silence is the midpoint
	return new Blob([buf], { type: 'audio/wav' });
}

const urls = new Map<number, string>();

/** Object URL of a silent clip, cached per duration. */
export function silenceUrl(ms: number): string {
	let url = urls.get(ms);
	if (!url) {
		url = URL.createObjectURL(silentWav(ms));
		urls.set(ms, url);
	}
	return url;
}
