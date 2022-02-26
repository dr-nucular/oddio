<script>
	import { onDestroy } from 'svelte';
	import { firebaseLogin, firebaseLogout } from '../firebase.js';
	import { sModules, sAuthInfo } from '../stores.js';

	// subscription vars
	let modules = {};
	let isLoggedIn = false;
	let title = 'Log In';
	let email = null;

	// store subscriptions
	const unsubAuthInfo = sAuthInfo.subscribe(obj => {
		isLoggedIn = obj.isLoggedIn;
		title = isLoggedIn ? "Log Out" : "Log In";
		email = obj.username;
	});
	const unsubModules = sModules.subscribe(obj => modules = obj);
	$: cssVarStyles = `--bgColor:${modules.auth?.bgColor}`;


	onDestroy(() => {
		unsubAuthInfo();
		unsubModules();
	});
</script>

<div
	style={cssVarStyles}
	class="content-module">
	<h2>&starf;&nbsp; {title} &nbsp;&starf;</h2><hr/>
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
	h2 {
		margin: 0 0 12px;
	}
</style>