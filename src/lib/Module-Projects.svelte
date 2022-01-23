<script>
	import { queryProjects, createProject } from '../firebase.js';
	import { sAuthInfo, sModules, sProjects, sCurProject } from '../stores.js';

	let isLoggedIn = false;
	let modules = {};
	let projects = [];
	let curProject = null;

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
	sCurProject.subscribe(obj => curProject = obj);

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
	<b>Load Project</b><hr/>
	{#if isLoggedIn}
		Current project: <b>{curProject?.data?.name}</b> [id: {curProject?.id}]
		<br/><br/>

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
</style>