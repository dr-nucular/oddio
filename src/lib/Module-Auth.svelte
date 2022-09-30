<script>
	import { onDestroy } from 'svelte';
	import { firebaseLogin, firebaseLoginAnon, firebaseLogout } from '../firebase.js';
	import { sModules, sAuthInfo } from '../stores.js';

	// subscription vars
	let modules = {};
	let authInfo;
	let title = 'Log In';
	let displayName;

	// store subscriptions
	const unsubAuthInfo = sAuthInfo.subscribe(obj => {
		authInfo = obj;
		title = authInfo?.isLoggedIn ? 'Log Out' : 'Log In';
		displayName = obj.isAnonymous ? 'anonymous' : obj.displayName;
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
	{#if authInfo?.isLoggedIn}
		{#if authInfo.isAnonymous}
			You are logged in anonymously
		{:else}
			You are logged in as {authInfo.displayName}
		{/if}
		(uid: {authInfo.uid}).<br/>
		<br/>
		<button on:click={firebaseLogout}>Log Out</button>	
	{:else}
		You are not currently logged in.<br/><br/>
		<button on:click={firebaseLogin}>Log In With Google</button> or
		<button on:click={firebaseLoginAnon}>Log In Anonymously</button>
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