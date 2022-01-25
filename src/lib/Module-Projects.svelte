<script>
	import { queryProjects, readContent, createProject } from '../firebase.js';
	import { sAuthInfo, sModules, sProjects, sCurProject, sCurSoundSet, sCurGraph, sCurComposition } from '../stores.js';

	let isLoggedIn = false;
	let modules = {};
	let projects = [];
	let curProject = null;
	let curSoundSet = null;
	let curGraph = null;
	let curComposition = null;

	const shouldRequestProjects = () => {
		return !!(isLoggedIn & !projects.length);
	};

	const requestProjects = async () => {
		const data = await queryProjects();
		sProjects.set(data);
		// for now, save first one to sCurProject
		if (data.length) {
			sCurProject.set(data[0]);
		}
	};



	sAuthInfo.subscribe(obj => isLoggedIn = obj.isLoggedIn);

	sModules.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.projects?.bgColor}`;

	sProjects.subscribe(objs => projects = objs);
	sCurProject.subscribe(async obj => {
		curProject = obj;
		if (curProject) {
			const curSoundSetId = curProject.data?.soundSet?.id || null;
			if (curSoundSetId) {
				curSoundSet = await readContent('soundSets', curSoundSetId);
				sCurSoundSet.set(curSoundSet);				
			}
			const curGraphId = curProject.data?.graph?.id || null;
			if (curGraphId) {
				curGraph = await readContent('graphs', curGraphId);
				sCurGraph.set(curGraph);				
			}
			const curCompositionId = curProject.data?.composition?.id || null;
			if (curCompositionId) {
				curComposition = await readContent('compositions', curCompositionId);
				sCurComposition.set(curComposition);				
			}
		}
	});
	sCurSoundSet.subscribe(obj => curSoundSet = obj);
	sCurGraph.subscribe(obj => curGraph = obj);
	sCurComposition.subscribe(obj => curComposition = obj);

	if (shouldRequestProjects()) {
		requestProjects();
	}
	





	const createNewProject = (projName) => {
		console.log(`TEMP DISABLED`);
		return;
		createProject(`test ${Math.random()}`);
		requestProjects();
	};

</script>

<div
	style={cssVarStyles}
	class="content-module">
	<h2>&starf;&nbsp; Projects &nbsp;&starf;</h2><hr/>
	{#if isLoggedIn}
		Current project: <b>{curProject?.data?.name}</b> [id: {curProject?.id}]<br/>
		- Current soundSet: <b>{curSoundSet?.data?.name}</b> [id: {curSoundSet?.id}]<br/>
		- Current graph: <b>{curGraph?.data?.name}</b> [id: {curGraph?.id}]<br/>
		- Current composition: <b>{curComposition?.data?.name}</b> [id: {curComposition?.id}]<br/>
		<br/>

		My projects:
		<ol>
			{#each projects as project, p}
				<li>
					<a href="setCurProject_{project.id}">{project.data?.name}</a> [id: {project.id}]
				</li>
			{/each}
		</ol>

		<button on:click={() => createNewProject('placeholder name')}>Create New</button><br/>
	{/if}

	<!--Public projects:-->
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