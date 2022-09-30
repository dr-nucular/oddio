<script>
	import { onDestroy } from 'svelte';
	import MagicButton from './MagicButton.svelte';
	import { sAuthInfo, sCurProject } from '../stores.js';

	// exported attributes
	export let showProjects = false;
	export let showClock = false;
	export let showSync = false;

	// subscription vars
	let notLoggedIn = true;
	let noCurProject = true;
	let noAccessYet = true;

	// subscriptions
	const unsubAuthInfo = sAuthInfo.subscribe(obj => {
		notLoggedIn = !obj.isLoggedIn;
		noAccessYet = notLoggedIn || noCurProject;
	});
	const unsubCurProject = sCurProject.subscribe(obj => {
		noCurProject = obj === null;
		noAccessYet = notLoggedIn || noCurProject;
	});

	onDestroy(() => {
		unsubAuthInfo();
		unsubCurProject();
	});

</script>

<MagicButton text="Projects" disabled={notLoggedIn} color="#bb99bb" moduleName="projects" visible={showProjects}/>
<hr/>
<MagicButton text="Sync" color="#ccaa88" moduleName="sync" visible={showSync}/>
<br/>
<MagicButton text="Clock" color="#88cccc" moduleName="clock" visible={showClock}/>
<br/>

<style>

	hr {
		border: 0;
		height: 2px;
		background: #ff3e00;
		background-image: linear-gradient(to left, #fff, #ff3e00);
		margin: 6px 0 12px;
	}

</style>