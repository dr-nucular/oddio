<script>
	//import Visibility from '';
	import { onMount, onDestroy } from 'svelte';
	import { sModules, sAudioContextInfo } from '../stores.js';
	import Oddio from '$lib/Oddio.js';

	let modules = {};
	let audioContextInfo = {};

	sModules.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.audioSystem?.bgColor}`;

	sAudioContextInfo.subscribe(obj => audioContextInfo = obj);

	let frame;
	let mTime = {};
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
	onMount(() => {
		//console.log(`ON MOUNT`);
		startLoop(); // TODO: only do this if the audio context is running?
	});
	onDestroy(() => {
		//console.log(`ON DESTROY`);
		stopLoop();
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
	<i>- Playhead Time: {mTime.now}</i>
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