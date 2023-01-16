<svelte:head>
	<title>Rock out</title>
</svelte:head>

<script>
	import '../game.css';
	import { onMount, onDestroy } from 'svelte';
	import { sAuthInfo } from '../stores.js';
	import { firebaseCreateUserObserver } from '../firebase.js';
	import { getUrlParams, lsSetPeerSessionId } from '$lib/utils.js';

	import Game from '$lib/Game.svelte';

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
		sidebarsVisible = true;
	};

	const hideSidebars = () => {
		console.log(`HIDE`);
		sidebarsVisible = false;
	};

</script>

<div id="wrapper" class:show-sidebars="{sidebarsVisible === true}">
	<div id="header" class="head-and-foot">
		Log in // Share link
	</div>
	<div class="sidebar">
		Left sidebar goes here
	</div>
	<div id="gamearea">
		<Game/>
	</div>
	<div class="sidebar">
		Right sidebar goes here
	</div>
	<div id="footer" class="head-and-foot">
		<button on:click={() => showSidebars()}>Show Sidebars</button>
		<button on:click={() => hideSidebars()}>Hide Sidebars</button>
	</div>
</div>

<style>
	#wrapper {
		display: grid;
		height: 100vh;
		grid-template-columns: 0 auto 0;
		grid-template-rows: 28px auto 50px;
		grid-gap: 0;
		padding: 0;
		overflow: hidden;
		transition: grid-template-columns 0.25s ease-in-out;
	}
	.head-and-foot {
		padding: 5px;
		overflow: hidden;
		grid-column: 1 / 4;
		text-align: center;
		align-items: center;
		justify-content: center;
		margin: auto 0;
	}
	#gamearea {
		margin: auto;
	}
	.sidebar {
		background-color: #444;
		padding: 0;
		overflow-x: hidden;
		overflow-y: auto;
	}
	.show-sidebars {
		grid-template-columns: 200px auto 200px !important;
	}
</style>