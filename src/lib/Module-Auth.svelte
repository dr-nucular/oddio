<script>
	import { firebaseLogin, firebaseLogout } from '../firebase.js';
	import { sModules, sAuthInfo } from '../stores.js';

	let modules = {};
	let isLoggedIn = false;
	let title = 'Log In';
	let email = null;

	sAuthInfo.subscribe(obj => {
		isLoggedIn = obj.isLoggedIn;
		title = isLoggedIn ? "Log Out" : "Log In";
		email = obj.username;
	});
	
	sModules.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.auth?.bgColor}`;
</script>

<div
	style={cssVarStyles}
	class="content-module">
	<b>{title}</b><hr/>
	{#if isLoggedIn}
		You are logged in with Google account {email}.<br/><br/>
		<button on:click={firebaseLogout}>Log Out</button>	
	{:else}
		You are not currently logged in.<br/><br/>
		<button on:click={firebaseLogin}>Log In</button> using Google authentication
	{/if}
</div>

<style>
	div.content-module {
		background:
			linear-gradient(to top, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%),
			var(--bgColor);
	}
</style>