<script>
	import { readProjects, createProject } from '../firebase.js';
	import { uiModulesData, authData } from '../stores.js';

	let modules = {};
	let isLoggedIn = false;
	let email = null;
	authData.subscribe(obj => {
		isLoggedIn = obj.isLoggedIn;
		email = obj.username;
	});
	uiModulesData.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.loadProject?.bgColor}`;

	//const myProjects = readProjects();



	let myProjects = [{ id: 123, data: {name: "yes"} }, { id: 234, data: {name: "yes2"} }];
	const getMyProjects = async () => {
		myProjects = await readProjects();
	};
	getMyProjects();





	const createNewProject = (projName) => {
		createProject(`test ${Math.random()}`);
	};

</script>

<div
	style={cssVarStyles}
	class="content-module">
	<b>Load Project</b><hr/>
	{#if isLoggedIn}
		Your projects:<br/><br/>
		<ul>
			{#each myProjects as project, p}
				<li><a href="temp_{project.id}">
					{p + 1}: {project.data?.name}
				</a></li>
			{/each}
		</ul>
		<button on:click={() => createNewProject('placeholder name')}>Create New</button><br/>
	{/if}
	Public projects:
</div>

<style>
	div.content-module {
		background:
			linear-gradient(to top, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%),
			var(--bgColor);
	}
</style>