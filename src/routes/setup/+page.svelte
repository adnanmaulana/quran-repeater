<script lang="ts">
	import { resolve } from '$app/paths';
	import ComingSoon from '#lib/components/ComingSoon.svelte';
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
</script>

<svelte:head><title>{m.set_up_repeat()} · {m.app_name()}</title></svelte:head>

<ScreenHeader title={m.set_up_repeat()} backHref={resolve('/(tabs)')} />
<ComingSoon />
