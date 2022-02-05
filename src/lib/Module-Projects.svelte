<script>
	import { queryProjects, readContent, createProject } from '../firebase.js';
	import { sAuthInfo, sModules, sProjects, sCurProject, sProjDocProps, sActiveProjDocs } from '../stores.js';

	let isLoggedIn = false;
	let modules = {};
	let projects = [];
	let curProject = null;

	//let curSoundSet = null;
	//let curGraph = null;
	//let curComposition = null;

	let projDocProps = null;
	let projCurDocs = {};

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

	sProjDocProps.subscribe(collections => projDocProps = collections);

	sProjects.subscribe(objs => projects = objs);
	sCurProject.subscribe(async obj => {
		curProject = obj;
		if (curProject) {
			const curSoundSetId = curProject.data?.soundSet?.id || null;
			if (curSoundSetId) {
				projCurDocs.soundSets = await readContent('soundSets', curSoundSetId);
				//sCurSoundSet.set(curSoundSet);				
			} else {
				projCurDocs.soundSets = null;
			}

			const curGraphId = curProject.data?.graph?.id || null;
			if (curGraphId) {
				projCurDocs.graphs = await readContent('graphs', curGraphId);
				//sCurGraph.set(curGraph);				
			} else {
				projCurDocs.graphs = null;
			}

			const curCompositionId = curProject.data?.composition?.id || null;
			if (curCompositionId) {
				projCurDocs.compositions = await readContent('compositions', curCompositionId);
				//sCurComposition.set(curComposition);				
			} else {
				projCurDocs.compositions = null;
			}

			sActiveProjDocs.set(projCurDocs);
		}
	});
	//sCurSoundSet.subscribe(obj => curSoundSet = obj);
	//sCurGraph.subscribe(obj => curGraph = obj);
	//sCurComposition.subscribe(obj => curComposition = obj);
	sActiveProjDocs.subscribe(collections => projCurDocs = collections);

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
		Current Project: <b>{curProject?.data?.name}</b> [id: {curProject?.id}]<br/>
		- Active Sound Set: <b>{projCurDocs?.soundSets?.data?.name}</b> [id: {projCurDocs?.soundSets?.id}]<br/>
		- Active Audio Graph: <b>{projCurDocs?.graphs?.data?.name}</b> [id: {projCurDocs?.graphs?.id}]<br/>
		- Active Composition: <b>{projCurDocs?.compositions?.data?.name}</b> [id: {projCurDocs?.compositions?.id}]<br/>
		<br/>

		My Projects:
		<ol>
			{#each projects as project, p}
				<li>
					<b>{project.data?.name}</b>
					<small>[id: {project.id}]</small>
					&Pr; Load
					&squf; Clone
					&Sc;
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