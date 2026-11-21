import { expect, it } from 'vitest';
import { silentWav } from './silence';

it('builds a valid silent WAV of the right length', async () => {
	const blob = silentWav(1500);
	const v = new DataView(await blob.arrayBuffer());
	const text = (o: number) => String.fromCharCode(...new Uint8Array(v.buffer, o, 4));
	expect(blob.type).toBe('audio/wav');
	expect(text(0)).toBe('RIFF');
	expect(text(8)).toBe('WAVE');
	expect(v.getUint32(24, true)).toBe(8000); // sample rate
	expect(v.getUint32(40, true)).toBe(12000); // 1.5 s of samples
	expect(v.getUint8(44)).toBe(128); // silence
});
