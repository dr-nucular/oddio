<script>
	import { sModules } from '../stores.js';
	import AuthModule from '$lib/Module-Auth.svelte';
	import ProjectsModule from '$lib/Module-Projects.svelte';
	import SoundSetsModule from '$lib/Module-SoundSets.svelte';
	import GraphsModule from '$lib/Module-Graphs.svelte';
	import CompositionsModule from '$lib/Module-Compositions.svelte';
	import AudioSystemModule from '$lib/Module-AudioSystem.svelte';
	import WaveformsModule from '$lib/Module-Waveforms.svelte';

	let modules = {};

	sModules.subscribe(obj => modules = obj);
</script>


{#if modules.auth?.visible}
	<AuthModule/>
{/if}

{#if modules.projects?.visible}
	<ProjectsModule/>
{/if}

{#if modules.soundSets?.visible}
	<SoundSetsModule/>
{/if}

{#if modules.graphs?.visible}
	<GraphsModule/>
{/if}

{#if modules.compositions?.visible}
	<CompositionsModule/>
{/if}

{#if modules.audioSystem?.visible}
	<AudioSystemModule/>
{/if}

{#if modules.waveforms?.visible}
	<WaveformsModule/>
{/if}


