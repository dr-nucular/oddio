<script>
import QRCode from 'qrcode'; // https://www.npmjs.com/package/qrcode
import { onDestroy } from 'svelte';
import { getServerTimestamp } from '../firebase.js';
import { sAuthInfo, sModules, sProject } from '../stores.js';
import { delay, getDeviceId } from './utils';


// subscription vars
let authInfo = {};
let modules = {};

// other states
let syncButton;
let qrButton;
let qrCanvas;
let project;
let latencyGuess = {
	startedAt: null,
	receivedAt: null,
	finishedAt: null,

	sendDurGuess: 1000,
	sendDurActual: null,
	returnDurGuess: 1000,
	returnDurActual: null,
	serverTimeGuess: null,
	serverTimeActual: null,
};

// store subscriptions
const unsubAuthInfo = sAuthInfo.subscribe(obj => authInfo = obj);
const unsubModules = sModules.subscribe(obj => modules = obj);
$: cssVarStyles = `--bgColor:${modules.sync?.bgColor}`;
const unsubProject = sProject.subscribe(obj => project = obj);

const startSync = async () => {
	/*
	project = { name: "Testttt", startTime: 0, endTime: 184.56789 };
	sProject.set(project);
	*/
	const d = getDeviceId();
	console.log(`>>> deviceId =`, d);

	syncButton.innerText = "Syncing...";
	syncButton.disabled = true;

	const syncDur = await _syncRequest();
	console.log(`... syncDur ${syncDur}`);

	syncFinished();
};

const _syncRequest = async () => {
	//if (!latencyGuess) {
	//
	//}
	const startTime = performance.now();
	//const ms = Math.random() * 1000; // 0 to 1 second
	const syncDur = await getServerTimestamp().then((sts) => {
		console.log(`>>> sts:`, sts);
		const endTime = performance.now();
		const d = endTime - startTime;
		return d;
	});
	return syncDur;
};



const syncFinished = () => {
	syncButton.innerText = "Re-Sync";
	syncButton.disabled = false;
};


const generateQR = async () => {
	try {
		const url = "hello world?";
		const result = await QRCode.toCanvas(qrCanvas, url);
		qrCanvas.style.display = 'block';
		console.log(result);
	} catch (err) {
		console.error(err);
	}
}


onDestroy(() => {
	unsubAuthInfo();
	unsubModules();
	unsubProject();
});

</script>


<div
	style={cssVarStyles}
	class="content-module">
	<h2>&starf;&nbsp; Sync &nbsp;&starf;</h2><hr/>

	{#if authInfo.isLoggedIn}
		Logged in: {authInfo.email}
	{:else}
		Logged out
	{/if}
	<br/>

	{#if project}
		Project: {project?.name}
	{:else}
		Project not set
	{/if}
	<br/><br/>

	<button on:click={startSync} bind:this={syncButton}>Sync Me</button><br/>

	<button on:click={generateQR} bind:this={qrButton}>Generate QRCode</button><br/>

	<canvas bind:this={qrCanvas}></canvas>
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
	a {
		cursor: pointer;
	}
	canvas {
		display: none;
	}
</style>