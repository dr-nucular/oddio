<script>
import QRCode from 'qrcode'; // https://www.npmjs.com/package/qrcode
import { onMount, onDestroy } from 'svelte';
import { dbCreateGroupSession, dbQueryGroupSessions } from '../firebase.js';
import { sAuthInfo, sModules, sProject, sSyncSettings } from '../stores.js';

// subscription vars
let authInfo = {};
let modules = {};
let syncSettings = {};

// other states
let groupSessionId;
let groupSessions;
let createButton;
let qrButton;
let qrCanvas;
let project;



// store subscriptions
const unsubAuthInfo = sAuthInfo.subscribe(obj => authInfo = obj);
const unsubModules = sModules.subscribe(obj => modules = obj);
$: cssVarStyles = `--bgColor:${modules.groupSession?.bgColor}`;
const unsubProject = sProject.subscribe(obj => project = obj);
const unsubSyncSettings = sSyncSettings.subscribe(obj => syncSettings = obj);


const getGroupSessions = async () => {
	try {
		const groupSessionsData = await dbQueryGroupSessions();
		groupSessions = groupSessionsData.map(gsd => {
			return { id: gsd.id, data: gsd.data() };
		});
	} catch (err) {
		console.error(`getGroupSessions() ERROR:`, err);
	}
};

const createGroupSession = async () => {
	// TODO
	console.log(`createGroupSession: not implemented yet.`);
	//const sesh = await dbCreateGroupSession();
};


const generateQR = async () => {
	try {
		const url = `${window.location.href}/?gsid=abcde&peerId=12345`; // TODO: remove peerId
		const result = await QRCode.toCanvas(qrCanvas, url);
		qrCanvas.style.display = 'block';
		//console.log(result);
	} catch (err) {
		console.error(err);
	}
}

onMount(() => {
	console.log(`ON MOUNT`);
	getGroupSessions();
});
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
	<h2>&starf;&nbsp; Group Session &nbsp;&starf;</h2><hr/>

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

	You are not in a group session.

	{#if groupSessions?.length}
		Join one of these?
		<ul>
		{#each groupSessions as gs}
			<li>
				{gs.id}: (created {gs.data.createdAt})
				Join Button
			</li>
		{/each}
		</ul>
	{:else}
		There aren't any to join, but you can create one and share a link with others.<br/><br/>
	{/if}

	<button on:click={createGroupSession} bind:this={createButton}>Create New Group Session</button>
	



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
	canvas {
		display: none;
	}
</style>