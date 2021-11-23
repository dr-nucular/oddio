<script>

	import { uiModulesData } from '../stores.js';
	import LogInOutModule from '$lib/Module-LogInOut.svelte';
	import LoadProjectModule from '$lib/Module-LoadProject.svelte';
	import AudioContextModule from '$lib/Module-AudioContext.svelte';
	import WaveformsModule from '$lib/Module-Waveforms.svelte';
	import SoundSourcesModule from '$lib/Module-SoundSources.svelte';
	import ChannelGraphModule from '$lib/Module-ChannelGraph.svelte';
	
	export let modules = {};
	uiModulesData.subscribe(obj => modules = obj);

</script>


{#if modules.logInOut?.visible}
	<LogInOutModule/>
{/if}

{#if modules.loadProject?.visible}
	<LoadProjectModule/>
{/if}

{#if modules.audioContext?.visible}
	<AudioContextModule/>
{/if}

{#if modules.soundSources?.visible}
	<SoundSourcesModule/>
{/if}

{#if modules.waveforms?.visible}
	<WaveformsModule/>
{/if}

{#if modules.channelGraph?.visible}
	<ChannelGraphModule/>
{/if}
