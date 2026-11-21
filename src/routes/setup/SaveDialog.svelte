<script lang="ts">
	import { NAME_MAX } from '#lib/playlists/playlists.js';
	import { m } from '#lib/paraglide/messages.js';

	let { initial, onsave, onclose }: { initial: string; onsave: (name: string) => void; onclose: () => void } = $props();

	let dialog: HTMLDialogElement;
	let name = $state('');

	$effect(() => {
		name = initial;
		dialog.showModal();
	});

	function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!name.trim()) return;
		onsave(name);
		dialog.close();
	}
</script>

<dialog bind:this={dialog} {onclose} aria-labelledby="save-title" onclick={(e) => e.target === dialog && dialog.close()}>
	<form onsubmit={submit}>
		<h2 id="save-title">{m.save_playlist()}</h2>
		<label>
			{m.playlist_name()}
			<!-- svelte-ignore a11y_autofocus -->
			<input bind:value={name} maxlength={NAME_MAX} required autofocus enterkeyhint="done" />
		</label>
		<div class="actions">
			<button type="button" class="secondary" onclick={() => dialog.close()}>{m.cancel()}</button>
			<button type="submit" class="primary" disabled={!name.trim()}>{m.save()}</button>
		</div>
	</form>
</dialog>

<style>
	dialog {
		width: min(100% - 32px, 420px);
		padding: 0;
		border: 0;
		border-radius: var(--r-xl);
		background: var(--surface);
		color: var(--ink);
	}
	dialog[open] {
		animation: dialog-in var(--spring-snappy-ms, 0.25s) var(--spring-snappy, ease-out);
	}
	dialog::backdrop {
		background: var(--scrim);
		animation: backdrop-in 0.2s ease-out;
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 20px;
	}
	h2 {
		margin: 0;
		font-size: 18px;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 13px;
		font-weight: 600;
		color: var(--muted);
	}
	input {
		height: 48px;
		padding: 0 14px;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--surface-2);
		font-size: 16px;
		color: var(--ink);
	}
	.actions {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}
	.actions button {
		height: 48px;
		border-radius: var(--r-md);
		font-size: 15px;
		font-weight: 600;
	}
	.secondary {
		border: 1px solid var(--line);
		background: var(--surface);
	}
	.primary {
		border: 0;
		background: var(--accent);
		color: var(--on-accent);
	}
	.primary:disabled {
		background: var(--border-strong);
	}
</style>
