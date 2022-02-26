<script>
	import { onDestroy } from 'svelte';
	import { sModules } from '../stores.js';

	// subscription vars
	let modules = {};

	// store subscriptions
	const unsubModules = sModules.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.waveforms?.bgColor}`;


	onDestroy(() => {
		unsubModules();
	});

</script>


<div
	style={cssVarStyles}
	class="content-module">
	<h2>&starf;&nbsp; Waveforms &nbsp;&starf;</h2><hr/>
	TBD!!?!
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