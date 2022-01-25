<script>
	import { queryContent, cloneContent } from '../firebase.js';
	import { sAuthInfo, sModules, sCurProject, sSoundSets, sCurSoundSet } from '../stores.js';

	let isLoggedIn = false;
	let modules = {};
	let curProject = null;
	let soundSets = [];
	let curSoundSet = null;

	const shouldRequestSoundSets = () => {
		return !!(isLoggedIn && curProject !== null && !soundSets.length);
	};

	const requestSoundSets = async () => {
		const data = await queryContent('soundSets', curProject?.id);
		sSoundSets.set(data);
	};



	sAuthInfo.subscribe(obj => isLoggedIn = obj.isLoggedIn);

	sModules.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.soundSets?.bgColor}`;

	sSoundSets.subscribe(objs => soundSets = objs);
	sCurSoundSet.subscribe(obj => curSoundSet = obj);
	sCurProject.subscribe(obj => {
		curProject = obj;
		if (shouldRequestSoundSets()) {
			requestSoundSets();
		}
	});

	if (shouldRequestSoundSets()) {
		requestSoundSets();
	}





	const createNewSoundSet = (name) => {
		console.log(`TEMP DISABLED`);
		return;
		//createProject(`test ${Math.random()}`);
		//getMyProjects();
	};

	const cloneSoundSet = async (soundSetId) => {
		const data = await cloneContent("soundSets", soundSetId);
		requestSoundSets();
	};

</script>

<div
	style={cssVarStyles}
	class="content-module">
	<h2>&starf;&nbsp; Sound Sets &nbsp;&starf;</h2><hr/>
	{#if isLoggedIn}
		For Project: <b>{curProject?.data?.name}</b> [id: {curProject?.id}]
		<br/><br/>

		Active Sound Set: <b>{curSoundSet?.data?.name}</b> [id: {curSoundSet?.id}]
		<br/><br/>

		My Sound Sets:
		<ol>
			{#each soundSets as soundSet, ss}
				<li>
					<b>{soundSet.data?.name}</b>
					<small>[id: {soundSet.id}]</small>
					&Pr; Activate
					&squf; Edit
					&squf; <a href={null} on:click={() => cloneSoundSet(soundSet.id)}>Clone</a>
					&Sc;
				</li>
			{/each}
		</ol>

		<button on:click={() => createNewSoundSet('placeholder name')}>Create New</button><br/>
	{/if}
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