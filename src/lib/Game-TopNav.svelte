<script>
	import { onDestroy } from 'svelte';
	import { sAuthInfo } from '../stores.js';

	// subscription vars
	let authButtonText = "";
	let authButtonDisabled = false;

	// subscriptions
	const unsubAuthInfo = sAuthInfo.subscribe(obj => {
		authButtonDisabled = obj.isBusy;
		if (authButtonDisabled) {
			authButtonText = "Checking...";
		} else {
			authButtonText = obj.isLoggedIn ? "Log Out" : "Log In";
		}
	});

	onDestroy(() => {
		unsubAuthInfo();
	});

	const spawnModal = () => {
		console.log(`spawnModal()`);
	};

</script>

<button disabled={authButtonDisabled} on:click={() => spawnModal()}>{authButtonText}</button>
<button on:click={() => spawnModal()}>Invite Friends</button>
