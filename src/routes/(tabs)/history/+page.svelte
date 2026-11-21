<script lang="ts">
	import ComingSoon from '#lib/components/ComingSoon.svelte';
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
</script>

<svelte:head><title>{m.nav_history()} · {m.app_name()}</title></svelte:head>

<ScreenHeader eyebrow={m.saved_on_device()} title={m.nav_history()} />
<ComingSoon />
