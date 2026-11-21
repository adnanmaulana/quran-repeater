<script lang="ts">
	import { resolve } from '$app/paths';
	import ComingSoon from '#lib/components/ComingSoon.svelte';
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
</script>

<svelte:head><title>{m.player_title()} · {m.app_name()}</title></svelte:head>

<!-- Phase 3: audio engine and the Now playing screen. -->
<ScreenHeader title={m.player_title()} backHref={resolve('/setup')} />
<ComingSoon />
