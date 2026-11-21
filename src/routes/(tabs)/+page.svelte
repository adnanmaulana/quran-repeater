<script lang="ts">
	import ComingSoon from '#lib/components/ComingSoon.svelte';
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
</script>

<ScreenHeader eyebrow={m.tagline()} title={m.app_name()} />
<ComingSoon />
