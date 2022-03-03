<script>
	//import Visibility from '';
	import { onMount, onDestroy } from 'svelte';
	import { sModules, sAudioContextInfo, sActiveProjDocs } from '../stores.js';
	import Oddio from '$lib/Oddio.js';

	// subscription vars
	let modules = {};
	let audioContextInfo = {};
	let activeProjDocs = {};

	// other states
	let frame;
	let mTime = {};
	let loadSourcesButton;

	// store subscriptions
	const unsubModules = sModules.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.audioSystem?.bgColor}`;
	const unsubAudioContextInfo = sAudioContextInfo.subscribe(obj => audioContextInfo = obj);
	const unsubActiveProjDocs = sActiveProjDocs.subscribe(collections => activeProjDocs = collections);



	const loop = function() {
		frame = requestAnimationFrame(loop);
		mTime = Oddio.getPlayheadNow();
	};
	const startLoop = () => {
		if (!frame) {
			console.log(`startLoop (raf)...`);
			loop();
		} else {
			console.log(`startLoop (raf) already started`);
		}
	};
	const stopLoop = () => {
		if (frame) {
			console.log(`stopLoop (raf)...`);
			cancelAnimationFrame(frame);
			frame = undefined;
		} else {
			console.log(`stopLoop (raf) already stopped`);
		}
	};
	const setPlayheadParams = (opts = {}) => {
		const timeReference = Oddio.setPlayheadParams(opts);
		console.log(`resetCurrentTime: ${JSON.stringify(timeReference, null, 2)}`);
	};


	const loadSoundSet = async () => {
		console.log(`loadSoundSet()`);
		try {
			const soundSet = activeProjDocs.soundSets?.data();
			const configJson = JSON.parse(soundSet.configJson);
			
			const sourceKeys = Object.keys(configJson.sounds);
			console.log(`- configJson.sounds (keys):`, sourceKeys);
			loadSourcesButton.innerText = "Loading Sound Set Sources";
			loadSourcesButton.disabled = true;

			const allLoadPromises = sourceKeys.map(sKey => Oddio.load(configJson.sounds[sKey]));
			await Promise.all(allLoadPromises);
			
			loadSourcesButton.innerText = "Load Sound Set Sources";
			loadSourcesButton.disabled = false;
			console.log(`loadSoundSet(): DONE`);
		} catch (err) {
			console.error(`loadSoundSet() ERROR:`, err);
		}
	};

	const startScheduler = () => {
		console.log(`startScheduler()`);
		const scheduler = Oddio.getScheduler('scheduler');
		scheduler.start();
	};
	const stopScheduler = () => {
		console.log(`stopScheduler()`);
		const scheduler = Oddio.getScheduler('scheduler');
		scheduler.stop();
	};


	onMount(() => {
		//console.log(`ON MOUNT`);
		startLoop(); // TODO: only do this if the audio context is running?
	});
	onDestroy(() => {
		//console.log(`ON DESTROY`);
		stopLoop();

		unsubModules();
		unsubAudioContextInfo();
		unsubActiveProjDocs();
	});
</script>

<div
	style={cssVarStyles}
	class="content-module">
	<h2>&starf;&nbsp; Audio System &nbsp;&starf;</h2><hr/>
	<button on:click={() => setPlayheadParams({ playheadTime: 0 })}>Reset Playhead to Zero</button><br/>
	<button on:click={() => setPlayheadParams({ playheadSpeed: 1 })}>Play</button>
	<button on:click={() => setPlayheadParams({ playheadSpeed: 0.1 })}>Slow</button>
	<button on:click={() => setPlayheadParams({ playheadSpeed: 0 })}>Stop</button><br/>
	<i>- State: {audioContextInfo.state}</i><br/>
	<i>- AudioContext Time: {mTime.currentTime}</i><br/>
	<i>- Playhead Time: {mTime.now}</i><br/>
	<br/>

	<button on:click={loadSoundSet} bind:this={loadSourcesButton}>Load Sound Set Sources</button><br/>

	<button on:click={startScheduler}>Scheduler Start</button><br/>
	<button on:click={stopScheduler}>Scheduler Stop</button><br/>
</div>

<style>
	div.content-module {
		background:
			linear-gradient(to top, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%),
			var(--bgColor);
	}
	h2 {
		margin: 0 0 12px;
	}
	a {
		cursor: pointer;
	}
</style>