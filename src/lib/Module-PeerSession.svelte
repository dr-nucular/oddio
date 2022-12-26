<script>
import QRCode from 'qrcode'; // https://www.npmjs.com/package/qrcode
import { onMount, onDestroy } from 'svelte';
import { dbCreatePeerSession, dbQueryPeerSessions } from '../firebase.js';
import { sAuthInfo, sModules, sProject, sSyncSettings } from '../stores.js';
import { getPeerSessionId, setPeerSessionId } from './utils';

// subscription vars
let authInfo = {};
let modules = {};
let syncSettings = {};

// other states
let peerSessionId;
let peerSessions;
let createButton;
let qrButton;
let qrCanvas;
let project;



// store subscriptions
const unsubAuthInfo = sAuthInfo.subscribe(obj => authInfo = obj);
const unsubModules = sModules.subscribe(obj => modules = obj);
$: cssVarStyles = `--bgColor:${modules.peerSession?.bgColor}`;
const unsubProject = sProject.subscribe(obj => project = obj);
const unsubSyncSettings = sSyncSettings.subscribe(obj => syncSettings = obj);


const getPeerSessions = async () => {
	try {
		const peerSessionsData = await dbQueryPeerSessions();
		peerSessions = peerSessionsData.map(psd => {
			return { id: psd.id, data: psd.data() };
		});
	} catch (err) {
		console.error(`getPeerSessions() ERROR:`, err);
	}
};

const createPeerSession = async () => {
	// TODO
	console.log(`createPeerSession: not implemented yet.`);
	//const sesh = await dbCreatePeerSession();
};

const setPeerSesssion = (id) => {
	setPeerSessionId(id);
	peerSessionId = getPeerSessionId();
	qrCanvas.style.display = 'none';
};

const generateQR = async (psid) => {
	try {
		//const url = `${window.location.href}/?psid=${psid}`;
		const url = `${window.location.origin}${window.location.pathname}?psid=${psid}`;
		const result = await QRCode.toCanvas(qrCanvas, url);
		qrCanvas.style.display = 'block';
	} catch (err) {
		console.error(err);
	}
}

onMount(() => {
	console.log(`ON MOUNT`);
	peerSessionId = getPeerSessionId(); // grabs from localStorage
	getPeerSessions();
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
	<h2>&starf;&nbsp; Peer Session &nbsp;&starf;</h2><hr/>

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

	You are not in a peer session.

	{#if peerSessions?.length}
		Join one of these?
		<ul>
		{#each peerSessions as ps}
			<li>
				id: {ps.id}
				<ul>
					<li>(created {ps.data.createdAt})</li>
					{#if ps.id === peerSessionId}
						<li>*** currently active: <button on:click={() => generateQR(ps.id)} bind:this={qrButton}>Invite others</button></li>
					{:else}
						<li><button on:click={() => setPeerSesssion(ps.id)}>Join</button></li>
					{/if}
				</ul>
			</li>
		{/each}
		</ul>
	{:else}
		There aren't any to join, but you can create one and share a link with others.<br/><br/>
	{/if}

	<canvas bind:this={qrCanvas}></canvas>

	<button on:click={createPeerSession} bind:this={createButton}>Create New Group Session</button>
	


	
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