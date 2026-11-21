<script lang="ts" module>
	// Stroke icons drawn for the design canvas (24×24 grid). Filled glyphs are marked with `fill`.
	const ICONS = {
		book: '<path d="M4 19V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h14"/>',
		playlist: '<path d="M4 6h12M4 12h12M4 18h7"/><path d="M17 15v6l4-3z" fill="currentColor"/>',
		history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
		settings:
			'<path d="M4 6h9M18 6h2M4 12h3M12 12h8M4 18h11M20 18h0"/><circle cx="15.5" cy="6" r="2.2"/><circle cx="9.5" cy="12" r="2.2"/><circle cx="17.5" cy="18" r="2.2"/>',
		mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
		search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
		back: '<path d="M15 18l-6-6 6-6"/>',
		chevron: '<path d="M9 18l6-6-6-6"/>',
		down: '<path d="M6 9l6 6 6-6"/>',
		check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
		close: '<path d="M6 6l12 12M18 6L6 18"/>',
		plus: '<path d="M5 12h14M12 5v14"/>',
		minus: '<path d="M5 12h14"/>',
		download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
		bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
		edit: '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-4-4L4 16z"/>',
		repeat:
			'<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
		moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
		info: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>',
		phone: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
		grip: '<g fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></g>',
		more: '<g fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></g>',
		play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
		pause:
			'<g fill="currentColor" stroke="none"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></g>',
		prev: '<g fill="currentColor" stroke="none"><rect x="5" y="5" width="2.4" height="14" rx="1"/><path d="M19 5.5v13L9 12z"/></g>',
		next: '<g fill="currentColor" stroke="none"><rect x="16.6" y="5" width="2.4" height="14" rx="1"/><path d="M5 5.5v13L15 12z"/></g>'
	} as const;

	export type IconName = keyof typeof ICONS;
</script>

<script lang="ts">
	let {
		name,
		size = 22,
		stroke = 2,
		label
	}: { name: IconName; size?: number; stroke?: number; label?: string } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={stroke}
	stroke-linecap="round"
	stroke-linejoin="round"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	style="flex-shrink: 0"
>
	<!-- Static markup from the ICONS table above, never user input. -->
	{@html ICONS[name]}
</svg>
