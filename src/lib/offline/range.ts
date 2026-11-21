/** Parse a single HTTP Range header ("bytes=0-99", "bytes=100-", "bytes=-500") against a size. */
export function parseRange(header: string, size: number): { start: number; end: number } | null {
	const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
	if (!m || (m[1] === '' && m[2] === '')) return null;
	let start: number;
	let end: number;
	if (m[1] === '') {
		const suffix = Number(m[2]);
		if (!suffix) return null;
		start = Math.max(0, size - suffix);
		end = size - 1;
	} else {
		start = Number(m[1]);
		end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
	}
	return start > end || start >= size ? null : { start, end };
}

/**
 * Answer a Range request from a full cached response. Media elements (iOS Safari especially)
 * request byte ranges and refuse to play a 200 where they asked for a 206.
 */
export async function partialResponse(full: Response, rangeHeader: string): Promise<Response> {
	const buf = await full.arrayBuffer();
	const size = buf.byteLength;
	const type = full.headers.get('Content-Type') ?? 'audio/mpeg';
	const r = parseRange(rangeHeader, size);
	if (!r) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
	return new Response(buf.slice(r.start, r.end + 1), {
		status: 206,
		headers: {
			'Content-Type': type,
			'Content-Range': `bytes ${r.start}-${r.end}/${size}`,
			'Content-Length': String(r.end - r.start + 1),
			'Accept-Ranges': 'bytes'
		}
	});
}
