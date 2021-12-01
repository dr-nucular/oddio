<script>
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
</script>

<div
	style={cssVarStyles}
	class="content-module">
	<b>Load Project</b><hr/>
	{#if isLoggedIn}
		Your projects:<br/><br/>
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