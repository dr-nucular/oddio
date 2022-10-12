<script>
import QRCode from 'qrcode'; // https://www.npmjs.com/package/qrcode
import { onDestroy } from 'svelte';
import { dbGetDevice, dbCreateDevice, dbUpdateDeviceClock, dbUpdateDeviceSync } from '../firebase.js';
import { sAuthInfo, sModules, sProject, sSyncSettings } from '../stores.js';
import { getDeviceId, setDeviceId } from './utils';
import Oddio from '$lib/Oddio.js';

/*
import {
	getFirestore, collection, query, where, orderBy, limit,
	doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
	serverTimestamp, Timestamp
} from "firebase/firestore";
*/

// subscription vars
let authInfo = {};
let modules = {};
let syncSettings = {};

// other states
let syncButton;
let latencyUpButton;
let latencyDnButton;
let qrButton;
let qrCanvas;
let project;

const MAX_SYNC_BATCH_SIZE = 23;
const MAX_CONSEC_SYNC_NO_IMP = 5;

let bestClockDiff; // highest value obtained
let fastestSyncDur;
let adjClockOffset; // bestClockDiff + (fastestSyncDur * 0.5)





// store subscriptions
const unsubAuthInfo = sAuthInfo.subscribe(obj => authInfo = obj);
const unsubModules = sModules.subscribe(obj => modules = obj);
$: cssVarStyles = `--bgColor:${modules.sync?.bgColor}`;
const unsubProject = sProject.subscribe(obj => project = obj);
const unsubSyncSettings = sSyncSettings.subscribe(obj => syncSettings = obj);

const startSync = async () => {
	syncButton.innerText = "Syncing...";
	syncButton.disabled = true;

	let deviceId = getDeviceId();
	let deviceData;
	if (deviceId) {
		deviceData = await dbGetDevice(deviceId); // TODO try/catch
	}
	if (!deviceData) {
		deviceData = await dbCreateDevice();
		deviceId = deviceData.id;
		setDeviceId(deviceId);
	}

	// reset best values here...
	bestClockDiff = undefined;
	fastestSyncDur = undefined;
	let numConsecNoImprovement = 0;
	for (let i = 0; i < MAX_SYNC_BATCH_SIZE; i++) {
		const syncResults = await _syncRequest();
		let improvement = false;
		if (bestClockDiff === undefined || syncResults.clockDiff > bestClockDiff) {
			bestClockDiff = syncResults.clockDiff;
			improvement = true;
		}
		if (fastestSyncDur === undefined || syncResults.syncDur < fastestSyncDur) {
			fastestSyncDur = syncResults.syncDur;
			improvement = true;
		}
		adjClockOffset = bestClockDiff + (fastestSyncDur * 0.5);
		numConsecNoImprovement = improvement ? 0 : numConsecNoImprovement + 1;

		console.log(`>> sync #${i+1}: clockDiff = ${syncResults.clockDiff}, syncDur = ${syncResults.syncDur}, adjClockOffset = ${adjClockOffset}`);

		if (numConsecNoImprovement > 0) {
			console.log(`--- no improvement`, numConsecNoImprovement);
		}
		if (numConsecNoImprovement >= MAX_CONSEC_SYNC_NO_IMP) break;
	}
	syncFinished();
};

const _syncRequest = async () => {
	const deviceId = getDeviceId();
	const syncData = await dbUpdateDeviceClock(deviceId).then((result) => {
		return {
			clockDiff: result.__clockDiff,
			syncDur: result.__updateDur
		};
	});
	return syncData;
};

const syncFinished = async () => {
	// update firestore
	const deviceId = getDeviceId();
	const ac = Oddio.getAC();
	const updatedData = {
		clockOffset: adjClockOffset,
		baseLatency: (ac.baseLatency || 0) * 1000,
		outputLatency: (ac.outputLatency || 0) * 1000
	};
	await dbUpdateDeviceSync(deviceId, updatedData);

	// update local store
	// TODO: move local store setting to the firestore.js method???
	const newSyncSettings = Object.assign({}, syncSettings, updatedData);
	sSyncSettings.set(newSyncSettings);

	syncButton.innerText = "Re-Sync";
	syncButton.disabled = false;
};

const nudgeLatency = async (value) => {
	latencyDnButton.disabled = true;
	latencyUpButton.disabled = true;

	// update firestore
	const deviceId = getDeviceId();
	const updatedData = {
		latencyAdjustment: (syncSettings?.latencyAdjustment || 0) + value
	};
	await dbUpdateDeviceSync(deviceId, updatedData);

	// update local store
	// TODO: move local store setting to the firestore.js method???
	const newSyncSettings = Object.assign({}, syncSettings, updatedData);
	sSyncSettings.set(newSyncSettings);

	latencyDnButton.disabled = false;
	latencyUpButton.disabled = false;
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
	unsubSyncSettings();
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

	

	<b>Sync Settings:</b>
	<button on:click={startSync} bind:this={syncButton}>Sync Me</button>
	<button on:click={() => nudgeLatency(-5)} bind:this={latencyDnButton}>-5ms</button>
	<button on:click={() => nudgeLatency(5)} bind:this={latencyUpButton}>+5ms</button>

		<ul>
		<li>clock offset: {syncSettings?.clockOffset}</li>
		<li>base latency: {syncSettings?.baseLatency}</li>
		<li>output latency: {syncSettings?.outputLatency}</li>
		<li>latency adjustment: {syncSettings?.latencyAdjustment}</li>
		</ul>

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