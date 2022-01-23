<script>
	import { queryContent } from '../firebase.js';
	import { sAuthInfo, sModules, sCurProject, sGraphs, sCurGraph } from '../stores.js';

	let isLoggedIn = false;
	let modules = {};
	let curProject = null;
	let graphs = [];
	let curGraph = null;

	const shouldRequestGraphs = () => {
		return !!(isLoggedIn && curProject !== null && !graphs.length);
	};

	const requestGraphs = async () => {
		const data = await queryContent('graphs', curProject?.id);
		sGraphs.set(data);
		// for now, save first one to sCurGraph
		if (data.length) {
			sCurGraph.set(data[0]);
		}
	};



	sAuthInfo.subscribe(obj => isLoggedIn = obj.isLoggedIn);

	sModules.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.graphs?.bgColor}`;

	sGraphs.subscribe(objs => graphs = objs);
	sCurGraph.subscribe(obj => curGraph = obj);
	sCurProject.subscribe(obj => {
		curProject = obj;
		if (shouldRequestGraphs()) {
			requestGraphs();
		}
	});

	if (shouldRequestGraphs()) {
		requestGraphs();
	}





	const createNewGraph = (name) => {
		console.log(`TEMP DISABLED`);
		return;
		//createProject(`test ${Math.random()}`);
		//getMyProjects();
	};

</script>

<div
	style={cssVarStyles}
	class="content-module">
	<b>Audio Graphs</b><hr/>
	{#if isLoggedIn}
		For Project: <b>{curProject?.data?.name}</b> [id: {curProject?.id}]
		<br/><br/>

		Current Graph: <b>{curGraph?.data?.name}</b> [id: {curGraph?.id}]
		<br/><br/>

		My Graphs:
		<ol>
			{#each graphs as graph, ss}
				<li>
					<a href="setCurGraph_{graph.id}">{graph.data?.name}</a> [id: {graph.id}]
				</li>
			{/each}
		</ol>

		<button on:click={() => createNewGraph('placeholder name')}>Create New</button><br/>
	{/if}
</div>

<style>
	div.content-module {
		background:
			linear-gradient(to top, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%),
			var(--bgColor);
	}
</style>