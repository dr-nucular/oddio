<svelte:head>
	<title>Odddio</title>
</svelte:head>

<script>
	import '../app.css';
	import Logo from '$lib/Logo.svelte';
	import TopNav from '$lib/TopNav.svelte';
	import LeftNav from '$lib/LeftNav-old.svelte';
	import Main from '$lib/Main-old.svelte';
	import { firebaseCreateUserObserver } from '../firebase.js';
	import { sAuthInfo } from '../stores.js';
	import { onMount, onDestroy } from 'svelte';

	const logoName = "odddio";
	let authInfo = {};

	sAuthInfo.subscribe(obj => authInfo = obj);

	onMount(async () => {
		console.log(`index.onMount()...`);
		authInfo.isBusy = true;
		sAuthInfo.set(authInfo);
		firebaseCreateUserObserver((user) => {
			if (user) {
				// User has signed in, see docs for a list of available properties
				// https://firebase.google.com/docs/reference/js/firebase.User
				authInfo.isLoggedIn = true;
				authInfo.email = user.email;

				// also init/populate a bunch of store data?  at least projects?
				
			} else {
				// User has signed out or there was an error using firebase
				authInfo.isLoggedIn = false;
				authInfo.email = null;

				// clear/reset store data here?  hmm doesn't seem to work as i was imagining

			}
			authInfo.isBusy = false;
			sAuthInfo.set(authInfo);
			console.log(`firebaseCreateUserObserver callback: authInfo = ${JSON.stringify(authInfo, null, 2)}`);
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
		text-align: left;
	}
	.leftnav {
		text-align: right;
	}

</style>