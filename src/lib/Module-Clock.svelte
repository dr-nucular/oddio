<script>
	//import Visibility from '';
	import { onMount, onDestroy } from 'svelte';
	import { sModules, sAudioContextInfo, sActiveProjDocs, sBuffs } from '../stores.js';
	import Oddio from '$lib/Oddio.js';

	// subscription vars
	let modules = {};
	let audioContextInfo = {};
	let activeProjDocs = {};
	let buffsArray = [];

	// other states
	let frame;
	let mTime = {};
	let loadSoundsButton;
	let loadGraphButton;
	let loadCompositionButton;
	let compositionId;

	// store subscriptions
	const unsubModules = sModules.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.clock?.bgColor}`;
	const unsubAudioContextInfo = sAudioContextInfo.subscribe(obj => audioContextInfo = obj);
	const unsubActiveProjDocs = sActiveProjDocs.subscribe(collections => activeProjDocs = collections);
	const unsubBuffs = sBuffs.subscribe(obj => {
		const filenames = Object.keys(obj).sort();
		buffsArray = filenames.map(fname => {
			const stateData = obj[fname];
			return {
				filename: fname,
				stateData
			}
		});
	});



	const loop = function() {
		frame = requestAnimationFrame(loop);
		mTime = Oddio.getClock();
		mTime.currentTimeRounded = mTime.currentTime.toFixed(2);
		mTime.nowRounded = mTime.now.toFixed(1);
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
	const setClockParams = (opts = {}) => {
		const clockRef = Oddio.setClockParams(opts);
		console.log(`setClockParams() clockRef: ${JSON.stringify(clockRef, null, 2)}`);
	};


	const loadSoundSet = async () => {
		console.log(`loadSoundSet()`);
		try {
			loadSoundsButton.innerText = "Loading Sound Set Sources";
			loadSoundsButton.disabled = true;

			const soundSet = activeProjDocs.soundSets?.data();
			const configJson = JSON.parse(soundSet.configJson);
			
			const soundSetKeys = Object.keys(configJson);
			const allLoadPromises = soundSetKeys.map(async ssKey => {
				const ssSounds = configJson[ssKey].sounds;
				const soundKeys = Object.keys(ssSounds);
				//console.log(`- configJson.sounds (keys):`, soundKeys);

				const ssLoadPromises = soundKeys.map(async sKey => {
					// each value can be a filename string, or an array of filenames
					const soundFilenames = Array.isArray(ssSounds[sKey]) ? ssSounds[sKey] : [ssSounds[sKey]];
					const buffs = soundFilenames.map(filename => Oddio.setBuff(filename, {
						stateCallback: (state) => {
							sBuffs.update(obj => {
								obj[state.filename] = state.stateData;
								return obj;
							});
						}
					}));
					Oddio.setSound(sKey, buffs);

					const loadPromise = await Oddio.load(soundFilenames);
					return loadPromise;
				});
				const ssGroupPromise = await Promise.all(ssLoadPromises);
				console.log(`soundSet "${ssKey}" sounds are all ready to go!`);
				return ssGroupPromise;
			});

			await Promise.all(allLoadPromises);
			
			loadSoundsButton.innerText = "Load Sound Set Sources";
			loadSoundsButton.disabled = false;
			console.log(`loadSoundSet(): DONE`);
		} catch (err) {
			console.error(`loadSoundSet() ERROR:`, err);
		}
	};

	const loadGraph = () => {
		console.log(`loadGraph()`);
		try {
			//loadGraphButton.innerText = "Loading Sound Set Sources";
			//loadGraphButton.disabled = true;

			const graph = activeProjDocs.graphs?.data();
			const configJson = JSON.parse(graph.configJson);

			const graphKeys = Object.keys(configJson);
			graphKeys.map(async gKey => {
				Oddio.setGraph(gKey, configJson[gKey]);
				// putting voice creation in composition for now
				//const voice = Oddio.createVoice(grph, `${grph.name}-01`);
				//voice.doMethod('init');
			});

			loadGraphButton.innerText = "Graph Loaded";
			//loadGraphButton.disabled = false;
			console.log(`loadGraph(): DONE`);
		} catch (err) {
			console.error(`loadGraph() ERROR:`, err);
		}
	};

	const loadComposition = () => {
		console.log(`loadComposition()`);
		try {
			//loadCompositionButton.innerText = "Loading Composition";
			//loadCompositionButton.disabled = true;

			const composition = activeProjDocs.compositions?.data();
			const configJson = JSON.parse(composition.configJson);

			const compKeys = Object.keys(configJson);
			compKeys.map(async cKey => {
				const scheduler = Oddio.getScheduler(cKey);
				scheduler.setEvents(configJson[cKey].events);

				compositionId = cKey; // last one for now
			});

			/*
			compositionId = configJson.id;
			const scheduler = Oddio.getScheduler(compositionId);
			scheduler.setEvents(configJson.events);
			*/

			loadCompositionButton.innerText = "Composition Loaded";
			//loadCompositionButton.disabled = false;
			console.log(`loadComposition(): DONE`);
		} catch (err) {
			console.error(`loadComposition() ERROR:`, err);
		}
	};


	const startScheduler = (mediaTime) => {
		console.log(`startScheduler(${mediaTime}) "${compositionId}"`);
		const scheduler = Oddio.getScheduler(compositionId);
		scheduler.start(mediaTime);
	};
	const stopScheduler = () => {
		console.log(`stopScheduler() "${compositionId}"`);
		const scheduler = Oddio.getScheduler(compositionId);
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
		unsubBuffs();
	});
</script>



<div
	style={cssVarStyles}
	class="content-module">
	<h2>&starf;&nbsp; Clock &nbsp;&starf;</h2><hr/>

	<div class="buffs">
		{#if buffsArray.length}
			{#each buffsArray as buff}
				{#if buff.stateData.error}
					<span class="error">{buff.filename}</span> [Err0r]
				{:else if buff.stateData.decoded}
					<span class="decoded">{buff.filename}</span> [READY]
				{:else if buff.stateData.decoding}
					<span class="decoding">{buff.filename}</span> [Decoding]
				{:else if buff.stateData.loaded}
					<span class="loaded">{buff.filename}</span> [Loaded]
				{:else if buff.stateData.loading}
					<span class="loading">{buff.filename}</span> [Loading]
				{:else}
					<span class="unloaded">{buff.filename}</span>
				{/if}
				<br/>
			{/each}
		{:else}
			No buffs
		{/if}
	</div>

	<button on:click={() => setClockParams({ mediaTime: 0 })}>Reset mediaTime to Zero</button><br/>
	<button on:click={() => setClockParams({ mediaSpeed: 1 })}>Play</button>
	<button on:click={() => setClockParams({ mediaSpeed: 0.1 })}>Slow</button>
	<button on:click={() => setClockParams({ mediaSpeed: 0 })}>Stop</button><br/>
	<i>- State: {audioContextInfo.state}</i><br/>
	<i>- AudioContext Time: {mTime.currentTimeRounded}</i><br/>
	<i>- Playhead Time: {mTime.nowRounded}</i><br/>
	<br/>

	<button on:click={loadSoundSet} bind:this={loadSoundsButton}>Load Sound Set Sources</button><br/>
	<button on:click={loadGraph} bind:this={loadGraphButton}>Load Graph</button><br/>
	<button on:click={loadComposition} bind:this={loadCompositionButton}>Load Composition</button><br/>

	<button on:click={startScheduler}>Scheduler Start</button>
	<button on:click={() => startScheduler(-1)}>Scheduler Start from mediaTime -1</button><br/>
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

	div.buffs {
		padding: 10px;
		float: right;
		width: 50%;
		background: white;
	}
	span.error { color: red; font-weight: 900; }
	span.decoded { color: black; font-weight: 900; }
	span.decoding { color: blue; }
	span.loaded { color: green; }
	span.loading { color: orange; }
	span.unloaded { color: gray; }
</style>