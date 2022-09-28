<script>
	import { onDestroy } from 'svelte';
	import { sAuthInfo, sModules, sProject } from '../stores.js';

	// subscription vars
	let authInfo = {};
	let modules = {};

	// other states
	let loadProjectButton;
	let project;

	// store subscriptions
	const unsubAuthInfo = sAuthInfo.subscribe(obj => authInfo = obj);
	const unsubModules = sModules.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.projects?.bgColor}`;
	const unsubProject = sProject.subscribe(obj => project = obj);



	const loadProject = () => {
		project = { name: "Testttt", startTime: 0, endTime: 184.56789 };
		sProject.set(project);

		loadProjectButton.innerText = "Reload Project";
		//const clockRef = Oddio.setClockParams(opts);
		//console.log(`setClockParams() clockRef: ${JSON.stringify(clockRef, null, 2)}`);
	};



	onDestroy(() => {
		unsubAuthInfo();
		unsubModules();
		unsubProject();
	});

</script>

<div
	style={cssVarStyles}
	class="content-module">
	<h2>&starf;&nbsp; Projects &nbsp;&starf;</h2><hr/>
	{#if authInfo.isLoggedIn}
		<button on:click={loadProject} bind:this={loadProjectButton}>Load Project</button><br/>

		{#if project}
			Name: <b>Test</b><br/>
			# Audio assets: <b>3</b><br/>
			Total MB of all assets: <b>3.12 MB</b><br/>
			Total MB in memory, decompressed: <b>7.23 MB</b><br/>
		{/if}

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
</style>