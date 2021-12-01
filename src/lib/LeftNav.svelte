<script>
	import MagicButton from './MagicButton.svelte';

	export let showAudioSystem = false;
	export let showSoundSources = false;
	export let showWaveforms = false;
	export let showChannelGraph = false;
</script>

<MagicButton text="Audio System" color="#88cccc" moduleName="AudioSystem" visible={showAudioSystem}/>
<MagicButton text="Sound Sources" color="#ccaa88" moduleName="soundSources" visible={showSoundSources}/>
<MagicButton text="Waveforms" color="#bb99bb" moduleName="waveforms" visible={showWaveforms}/>
<MagicButton text="Channel Graph" color="#88aacc" moduleName="channelGraph" visible={showChannelGraph}/>
