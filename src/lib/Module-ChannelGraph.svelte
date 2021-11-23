<script>

	import { uiModulesData, channelGraphData } from '../stores.js';

	export let modules = {};

	uiModulesData.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.channelGraph?.bgColor}`;

</script>


<div
	style={cssVarStyles}
	class="content-module">
	<b>Channel Graph</b><hr/>
	<ul>
		{#each $channelGraphData as graphNode}
			<li>{graphNode.name} - {graphNode.type}</li>
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