<script>
	import { onDestroy } from 'svelte';
	import { sModules } from '../stores.js';
	import AuthModule from '$lib/Module-Auth.svelte';
	import ProjectsModule from '$lib/Module-Projects.svelte';
	import ClockModule from '$lib/Module-Clock.svelte';
	import SyncModule from '$lib/Module-Sync.svelte';

	let modules = {};

	const unsubModules = sModules.subscribe(obj => modules = obj);

	onDestroy(() => {
		unsubModules();
	});
</script>


{#if modules.auth?.visible}
	<AuthModule/>
{/if}

{#if modules.projects?.visible}
	<ProjectsModule/>
{/if}

{#if modules.sync?.visible}
	<SyncModule/>
{/if}

{#if modules.clock?.visible}
	<ClockModule/>
{/if}




