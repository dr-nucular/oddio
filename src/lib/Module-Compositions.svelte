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

	const cloneComposition = async (compositionId) => {
		const data = await cloneContent("compositions", compostitionId);
		requestCompositions();
	};

</script>

<div
	style={cssVarStyles}
	class="content-module">
	<h2>&starf;&nbsp; Compositions &nbsp;&starf;</h2><hr/>
	{#if isLoggedIn}
		For Project: <b>{curProject?.data?.name}</b> [id: {curProject?.id}]
		<br/><br/>

		Active Composition: <b>{curComposition?.data?.name}</b> [id: {curComposition?.id}]
		<br/><br/>

		My Compositions:
		<ol>
			{#each compositions as composition, ss}
				<li>
					<b>{composition.data?.name}</b>
					<small>[id: {composition.id}]</small>
					&Pr; Activate
					&squf; Edit
					&squf; <a href={null} on:click={() => cloneComposition(composition.id)}>Clone</a>
					&Sc;
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
	h2 {
		margin: 0 0 12px;
	}
	a {
		cursor: pointer;
	}
</style>