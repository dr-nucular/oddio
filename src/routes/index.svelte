<svelte:head>
	<title>Oddio</title>
</svelte:head>

<script>
	import '../app.css';
	import Logo from '$lib/Logo.svelte';
	import TopNav from '$lib/TopNav.svelte';
	import LeftNav from '$lib/LeftNav.svelte';
	import Main from '$lib/Main.svelte';
	import { firebaseCreateUserObserver } from '../firebase.js';
	import { authData } from '../stores.js';
	import { onMount, onDestroy } from 'svelte';

	const logoName = "oddio";

	onMount(async () => {
		console.log(`index.onMount()...`);
		authData.isBusy = true;
		authData.set(authData);
		firebaseCreateUserObserver((user) => {
			if (user) {
				// User has signed in, see docs for a list of available properties
				// https://firebase.google.com/docs/reference/js/firebase.User
				authData.isLoggedIn = true;
				authData.username = user.email;
				// ? display logout button here?
			} else {
				// User has signed out or there was an error using firebase
				// ? display login button here?
				authData.isLoggedIn = false;
				authData.username = null;
			}
			authData.isBusy = false;
			authData.set(authData);
			console.log(`firebaseCreateUserObserver callback: authData = ${JSON.stringify(authData, null, 2)}`);
		});
	});

/*
	import Oddio from '$lib/Oddio.js';
	DO THIS IN A WELCOME module or modal or special welcome route?
	const initAC = async () => {
		return Oddio.init().catch(() => {
			console.log(`Failed to initialize audio subsystem.`);
		});
	}
	initAC();
*/
</script>

<div class="wrapper">
	<div class="box logo">
		<Logo title="{logoName}"/>
	</div>
	<div class="box topnav">
		<TopNav/>
	</div>
	<div class="box leftnav">
		<LeftNav/>
	</div>
	<div class="box content">
		<Main/>
	</div>
</div>

<style>
	.wrapper {
		display: grid;
		height: 100vh;
		grid-template-columns: 200px auto;
		grid-template-rows: 75px auto;
		grid-gap: 3px;
		background-color: #eee;
		padding: 0;
	}
	.box {
		background-color: #fff;
		color: #333;
		border-radius: 0;
		padding: 20px;
		min-height: 0;
		overflow-y: auto;
	}
	.logo {
		color: #ff3e00;
		font: italic 500 45px/35px Ubuntu;
		text-align: right;
	}
	.topnav {
		padding-bottom: 15px;
		text-align: right;
	}
	.leftnav {
		text-align: right;
	}

</style>