<script>
	import { queryContent } from '../firebase.js';
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
		// for now, save first one to sCurSoundSet
		if (data.length) {
			sCurSoundSet.set(data[0]);
		}
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

</script>

<div
	style={cssVarStyles}
	class="content-module">
	<b>Sound Sets</b><hr/>
	{#if isLoggedIn}
		For Project: <b>{curProject?.data?.name}</b> [id: {curProject?.id}]
		<br/><br/>

		Current Sound Set: <b>{curSoundSet?.data?.name}</b> [id: {curSoundSet?.id}]
		<br/><br/>

		My Sound Sets:
		<ol>
			{#each soundSets as soundSet, ss}
				<li>
					<a href="setCurSoundSet_{soundSet.id}">{soundSet.data?.name}</a> [id: {soundSet.id}]
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
</style>