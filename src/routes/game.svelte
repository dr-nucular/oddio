<svelte:head>
	<title>Rock out</title>
</svelte:head>

<script>
	import '../game.css';
	import { onMount, onDestroy } from 'svelte';
	import { sAuthInfo } from '../stores.js';
	import { firebaseCreateUserObserver } from '../firebase.js';
	import { getUrlParams, lsSetPeerSessionId } from '$lib/utils.js';

	/*
	import Logo from '$lib/Logo.svelte';
	import TopNav from '$lib/TopNav.svelte';
	import LeftNav from '$lib/LeftNav.svelte';
	import Main from '$lib/Main.svelte';
	const logoName = "..::!!??";
	*/

	let authInfo = {};
	let sidebarsVisible = false;

	sAuthInfo.subscribe(obj => authInfo = obj);

	onMount(async () => {
		console.log(`index.onMount()...`);
		authInfo.isBusy = true;
		sAuthInfo.set(authInfo);
		firebaseCreateUserObserver((user) => {
			if (user) {
				// User has signed in, see docs for a list of available properties
				// https://firebase.google.com/docs/reference/js/firebase.User
				authInfo = {
					isLoggedIn: true,
					isAnonymous: user.isAnonymous,
					displayName: user.displayName,
					email: user.email,
					uid: user.uid
				};

				// also init/populate a bunch of store data here?  perhaps their projects?
				
			} else {
				// User has signed out or there was an error using firebase
				authInfo = {
					isLoggedIn: false,
					isAnonymous: false,
					displayName: null,
					email: null,
					uid: null
				};

				// clear/reset store data here?  hmm doesn't seem to work as i was imagining

			}
			authInfo.isBusy = false;
			sAuthInfo.set(authInfo);
			console.log(`firebaseCreateUserObserver callback: authInfo = ${JSON.stringify(authInfo, null, 2)}`);
		});

		// look for certain querystring vars and save to local storage.
		// then remove those qs vars from url and refresh
		const urlParams = getUrlParams();
		let replaceLoc = false;
		if (urlParams.psid) {
			lsSetPeerSessionId(urlParams.psid);
			delete urlParams.psid;
			replaceLoc = true;
		}
		if (replaceLoc) {
			let url = `${window.location.origin}${window.location.pathname}`;
			let qsParamStr = '';
			if (Object.keys(urlParams).length) {
				qsParamStr = Object.keys(urlParams).map((key) => {
					return `${encodeURIComponent(key)}=${encodeURIComponent(urlParams[key])}`
				}).join('&');
				url += `?${qsParamStr}`;
			}
			window.location.replace(url);
		}
	});

	const showSidebars = () => {
		console.log(`SHOW`);
		//document.getElementById('wrapper').className = 'show-sidebars';
		sidebarsVisible = true;
	};

	const hideSidebars = () => {
		console.log(`HIDE`);
		//document.getElementById('wrapper').className = 'hide-sidebars';
		sidebarsVisible = false;
	};

</script>

<div id="wrapper" class:show-sidebars="{sidebarsVisible === true}">
	<div class="sidebar">
		Left sidebar goes here
	</div>
	<div class="gamearea">
		Phaser canvas goes here<br/><br/>
		<button on:click={() => showSidebars()}>Show Sidebars</button><br/>
		<button on:click={() => hideSidebars()}>Hide Sidebars</button>
	</div>
	<div class="sidebar">
		Right sidebar goes here
	</div>
</div>

<style>
	#wrapper {
		display: grid;
		height: 100vh;
		grid-template-columns: 20px auto 20px;
		grid-template-rows: auto;
		grid-gap: 0;
		padding: 0;
		transition: grid-template-columns 1s ease-in-out;
	}
	.gamearea {
		text-align: center;
		align-items: center;
		justify-content: center;
		margin: auto;
		border-radius: 0;
		min-height: 0;
		overflow-y: auto;
	}
	.sidebar {
		background-color: #444;
		padding: 10px;
	}
	.show-sidebars {
		grid-template-columns: 200px auto 200px !important;
	}



</style>