<script>
	import { onDestroy } from 'svelte';
	import { sModules } from '../stores.js';
	import AuthModule from '$lib/Module-Auth.svelte';
	import ProjectsModule from '$lib/Module-Projects-old.svelte';
	import ProjDocsModule from '$lib/Module-ProjDocs.svelte';
	import AudioSystemModule from '$lib/Module-AudioSystem.svelte';
	import WaveformsModule from '$lib/Module-Waveforms.svelte';

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

{#if modules.soundSets?.visible}
	<ProjDocsModule collectionStr="soundSets" />
{/if}

{#if modules.graphs?.visible}
	<ProjDocsModule collectionStr="graphs" />
{/if}

{#if modules.compositions?.visible}
	<ProjDocsModule collectionStr="compositions" />
{/if}

{#if modules.audioSystem?.visible}
	<AudioSystemModule/>
{/if}

{#if modules.waveforms?.visible}
	<WaveformsModule/>
{/if}


