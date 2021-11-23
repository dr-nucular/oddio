<script>

	import { uiModulesData, soundSourcesData } from '../stores.js';

	export let modules = {};

	uiModulesData.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.soundSources?.bgColor}`;

</script>


<div
	style={cssVarStyles}
	class="content-module">
	<b>Sound Sources</b><hr/>
	<ul>
		{#each $soundSourcesData as soundSource}
			<li>{soundSource.name} - {soundSource.src}</li>
		{/each} 
	</ul>
</div>


<style>
	div.content-module {
		background:
			linear-gradient(to top, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%),
			var(--bgColor);
	}
</style>