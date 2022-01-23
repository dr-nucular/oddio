<script>
	import { queryContent } from '../firebase.js';
	import { sAuthInfo, sModules, sCurProject, sCompositions, sCurComposition } from '../stores.js';

	let isLoggedIn = false;
	let modules = {};
	let curProject = null;
	let compositions = [];
	let curComposition = null;

	const shouldRequestCompositions = () => {
		return !!(isLoggedIn && curProject !== null && !compositions.length);
	};

	const requestCompositions = async () => {
		const data = await queryContent('compositions', curProject?.id);
		sCompositions.set(data);
		// for now, save first one to sCurComposition
		if (data.length) {
			sCurComposition.set(data[0]);
		}
	};



	sAuthInfo.subscribe(obj => isLoggedIn = obj.isLoggedIn);

	sModules.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.compositions?.bgColor}`;

	sCompositions.subscribe(objs => compositions = objs);
	sCurComposition.subscribe(obj => curComposition = obj);
	sCurProject.subscribe(obj => {
		curProject = obj;
		if (shouldRequestCompositions()) {
			requestCompositions();
		}
	});

	if (shouldRequestCompositions()) {
		requestCompositions();
	}





	const createNewComposition = (name) => {
		console.log(`TEMP DISABLED`);
		return;
		//createProject(`test ${Math.random()}`);
		//getMyProjects();
	};

</script>

<div
	style={cssVarStyles}
	class="content-module">
	<b>Compositions</b><hr/>
	{#if isLoggedIn}
		For Project: <b>{curProject?.data?.name}</b> [id: {curProject?.id}]
		<br/><br/>

		Current Composition: <b>{curComposition?.data?.name}</b> [id: {curComposition?.id}]
		<br/><br/>

		My Compositions:
		<ol>
			{#each compositions as composition, ss}
				<li>
					<a href="setCurComposition_{composition.id}">{composition.data?.name}</a> [id: {composition.id}]
				</li>
			{/each}
		</ol>

		<button on:click={() => createNewComposition('placeholder name')}>Create New</button><br/>
	{/if}
</div>

<style>
	div.content-module {
		background:
			linear-gradient(to top, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%),
			var(--bgColor);
	}
</style>