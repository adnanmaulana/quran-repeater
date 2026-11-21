import { describe, expect, it } from 'vitest';
import { parseRange, partialResponse } from './range';

describe('parseRange', () => {
	it('parses closed, open and suffix ranges', () => {
		expect(parseRange('bytes=0-99', 1000)).toEqual({ start: 0, end: 99 });
		expect(parseRange('bytes=100-', 1000)).toEqual({ start: 100, end: 999 });
		expect(parseRange('bytes=-200', 1000)).toEqual({ start: 800, end: 999 });
		expect(parseRange('bytes=900-5000', 1000)).toEqual({ start: 900, end: 999 });
	});

	it('rejects unsatisfiable or malformed ranges', () => {
		expect(parseRange('bytes=1000-', 1000)).toBeNull();
		expect(parseRange('bytes=50-10', 1000)).toBeNull();
		expect(parseRange('bytes=-', 1000)).toBeNull();
		expect(parseRange('items=0-1', 1000)).toBeNull();
	});
});

describe('partialResponse', () => {
	const full = () => new Response(new Uint8Array(Array.from({ length: 10 }, (_, i) => i)), { headers: { 'Content-Type': 'audio/mpeg' } });

	it('returns a 206 with the requested bytes', async () => {
		const res = await partialResponse(full(), 'bytes=2-4');
		expect(res.status).toBe(206);
		expect(res.headers.get('Content-Range')).toBe('bytes 2-4/10');
		expect(res.headers.get('Content-Length')).toBe('3');
		expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
		expect([...new Uint8Array(await res.arrayBuffer())]).toEqual([2, 3, 4]);
	});

	it('serves Safari’s probe request (bytes=0-1)', async () => {
		const res = await partialResponse(full(), 'bytes=0-1');
		expect(res.headers.get('Content-Range')).toBe('bytes 0-1/10');
	});

	it('returns 416 when the range cannot be satisfied', async () => {
		const res = await partialResponse(full(), 'bytes=20-');
		expect(res.status).toBe(416);
		expect(res.headers.get('Content-Range')).toBe('bytes */10');
	});
});
