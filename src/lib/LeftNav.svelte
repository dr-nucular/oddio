<script>
	import MagicButton from './MagicButton.svelte';
	import { sAuthInfo, sCurProject } from '../stores.js';

	export let showProjects = false;
	export let showSoundSets = false;
	export let showGraphs = false;
	export let showCompositions = false;
	export let showAudioSystem = false;
	export let showWaveforms = false;

	let notLoggedIn = true;
	let noCurProject = true;
	let noAccessYet = true;

	sAuthInfo.subscribe(obj => {
		notLoggedIn = !obj.isLoggedIn;
		noAccessYet = notLoggedIn || noCurProject;
	});

	sCurProject.subscribe(obj => {
		noCurProject = obj === null;
		noAccessYet = notLoggedIn || noCurProject;
	});

</script>

<MagicButton text="Projects" disabled={notLoggedIn} color="#bb99bb" moduleName="projects" visible={showProjects}/>
<hr/>
<MagicButton text="Sound Sets" disabled={noAccessYet} color="#88aacc" moduleName="soundSets" visible={showSoundSets}/>
<MagicButton text="Audio Graphs" disabled={noAccessYet} color="#dd9999" moduleName="graphs" visible={showGraphs}/>
<MagicButton text="Compositions" disabled={noAccessYet} color="#66aa66" moduleName="compositions" visible={showCompositions}/>
<hr/>
<MagicButton text="Audio System" color="#88cccc" moduleName="AudioSystem" visible={showAudioSystem}/>
<MagicButton text="Waveforms" color="#ccaa88" moduleName="waveforms" visible={showWaveforms}/>

<style>

	hr {
		border: 0;
		height: 2px;
		background: #ff3e00;
		background-image: linear-gradient(to left, #fff, #ff3e00);
		margin: 6px 0 12px;
	}

</style>